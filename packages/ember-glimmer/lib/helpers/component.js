import { CachedReference } from '../utils/references';
import { CurlyComponentDefinition } from '../syntax/curly-component';
import { EvaluatedArgs, EvaluatedNamedArgs, EvaluatedPositionalArgs } from 'glimmer-runtime';
import { assert } from 'ember-metal/debug';
import assign from 'ember-metal/assign';

const CLOSURE_COMPONENT = 'ba564e81-ceda-4475-84a7-1c44f1c42c0e';

export function isClosureComponent(object) {
  return object && !!object[CLOSURE_COMPONENT];
}

class ClosureComponentDefinition extends CurlyComponentDefinition {
  constructor(name, ComponentClass, template, args) {
    super(...arguments);
    this[CLOSURE_COMPONENT] = true;
  }
}

export class ClosureComponentReference extends CachedReference {
  static create(args, parentMeta, env) {
    return new ClosureComponentReference(args, parentMeta, env);
  }

  constructor(args, parentMeta, env) {
    super();
    this.defRef = args.positional.at(0);
    this.env = env;
    this.tag = args.tag;
    this.parentMeta = parentMeta;
    this.args = args;
  }

  compute() {
    // TODO: Figure out how to extract this because it's nearly identical to
    // DynamicComponentReference::compute(). The only differences besides
    // currying are in the assertion messages.
    let { args, defRef, env, parentMeta } = this;
    let nameOrDef = defRef.value();
    let definition = null;

    if (typeof nameOrDef === 'string') {
      definition = env.getComponentDefinition([nameOrDef], parentMeta);
      assert(`The component helper cannot be used without a valid component name. You used "${nameOrDef}" via (component "${nameOrDef}")`, definition);
    } else if (isClosureComponent(nameOrDef)) {
      definition = nameOrDef;
    } else {
      assert(
        `You cannot create a component from ${nameOrDef} using the {{component}} helper`,
        nameOrDef
      );
      return null;
    }

    let newDef = createCurriedDefinition(definition, args);

    return newDef;
  }
}

function createCurriedDefinition(definition, args) {
  let curriedArgs = curryArgs(definition, args);

  return new ClosureComponentDefinition(
    definition.name,
    definition.ComponentClass,
    definition.template,
    curriedArgs
  );
}

function curryArgs(definition, newArgs) {
  let { args, ComponentClass } = definition;
  let { positionalParams } = ComponentClass;
  
  // The args being passed in are from the (component ...) invocation,
  // so the first positional argument is actually the name or component
  // definition. It needs to be dropped in order for any actual positional
  // args to coincide with the ComponentClass's positionParams.

  // For "normal" curly components this slicing is done at the syntax layer,
  // but we don't have that luxury here.

  let [, ...slicedPositionalArgs] = newArgs.positional.values;

  if (positionalParams && slicedPositionalArgs.length) {
    validatePositionalParameters(newArgs.named, slicedPositionalArgs, positionalParams);
  }

  // args (aka 'oldArgs') may be undefined or simply be empty args, so
  // we need to fall back to an empty array or object.
  let oldNamed = args && args.named && args.named.map || {};
  let oldPositional = args && args.positional && args.positional.values || [];  

  // Merge positional arrays
  let mergedPositional = new Array(Math.max(oldPositional.length, slicedPositionalArgs.length));
  mergedPositional.splice(0, oldPositional.length, ...oldPositional);
  mergedPositional.splice(0, slicedPositionalArgs.length, ...slicedPositionalArgs);

  // Merge named maps
  let mergedNamed = assign({}, oldNamed, newArgs.named.map);

  let mergedArgs = EvaluatedArgs.create({
    named: EvaluatedNamedArgs.create({
      map: mergedNamed
    }),
    positional: EvaluatedPositionalArgs.create({
      values: mergedPositional
    })
  });

  return mergedArgs;
}

function validatePositionalParameters(named, positional, positionalParamsDefinition) {
  let paramType = typeof positionalParamsDefinition;

  if (paramType === 'string') {
    assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !named.has(positionalParamsDefinition));
  } else {
    if (positional.length < positionalParamsDefinition.length) {
      positionalParamsDefinition = positionalParamsDefinition.slice(0, positional.length);
    }

    for (let i = 0; i < positionalParamsDefinition.length; i++) {
      let name = positionalParamsDefinition[i];

      assert(
        `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
        !named.has(name)
      );
    }
  }
}

export default {
  isInternalHelper: true,

  toReference(args, env) {
    // TODO: Need to figure out what to do about parentMeta here.
    return ClosureComponentReference.create(args, null, env);
  }
};
