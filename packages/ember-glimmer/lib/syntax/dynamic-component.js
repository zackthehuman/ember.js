import { ArgsSyntax, StatementSyntax, EvaluatedArgs, EvaluatedNamedArgs, EvaluatedPositionalArgs } from 'glimmer-runtime';
import { ConstReference, isConst, UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { isClosureComponent } from '../helpers/component';
import { PropertyReference, RootReference } from '../utils/references';

function dynamicComponentFor(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  if (isConst(nameRef)) {
    let name = nameRef.value();
    let definition = env.getComponentDefinition([name]);

    return new ConstReference(definition);
  } else {
    return new DynamicComponentReference({ nameRef, env });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates }) {
    super();
    this.definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.definition = dynamicComponentFor;
    this.args = ArgsSyntax.build(args.positional.slice(1), args.named);
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env }) {
    this.nameRef = nameRef;
    this.env = env;
    this.tag = nameRef.tag;
  }

  value() {
    let { env, nameRef } = this;
    let maybeName = nameRef.value();
    let name;
    let args;

    if (isClosureComponent(maybeName)) {
      args = maybeName.getArgs();
      name = maybeName.getName();

      // At this point we can call maybeName.getArgs() to get the curried args.
      // We can construct an EvaluatedArgs from the `named` and `positional` properties.
      // Then they need to be merged with the invocation args.
    } else {
      name = maybeName;
    }

    //let definition = env.getComponentDefinition([name]);
    //assert(`Glimmer error: Could not find component named "${name}" (no component or template with that name was found)`, definition);

    return {
      definition: this.getComponentDefinition(name),
      args: args ? EvaluatedArgs.create({
        named: EvaluatedNamedArgs.create({
          map: args.named || {}
        }),
        positional: EvaluatedPositionalArgs.create({
          values: args.positional
        })
      }) : EvaluatedArgs.empty()
    };
  }

  get(key) {
    if ('definition' === key) {
      let name = this.nameRef.value();

      if (isConst(this.nameRef)) {
        return new RootReference(this.getComponentDefinition(name));
      } else {
        return new PropertyReference(this, 'definition');
      }
    } else if ('args' === key) {
      return new PropertyReference(this, 'args');
    }

    return UNDEFINED_REFERENCE;
  }

  getComponentDefinition(name) {
    assert(
      `You cannot create a component from ${name} using the {{component}} helper`,
      name
    );

    let definition = this.env.getComponentDefinition([name]);

    assert(
      `The component helper cannot be used without a valid component name. You used "${name}" via (component "${name}")`,
      definition
    );

    return definition;
  }
}
