import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { isClosureComponentRef } from '../helpers/component';

class DynamicComponentLookup {
  constructor(args) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = dynamicComponentFor;
  }
}

function extractComponentNameReference(args) {
  let nameRef = args.positional.at(0);

  if (isClosureComponentRef(nameRef)) {
    nameRef = nameRef.value().args.positional.at(0);
  }

  return nameRef;
}

function dynamicComponentFor(args, { env }) {
  let nameRef = extractComponentNameReference(args);

  if (isConst(nameRef)) {
    return new ConstReference(lookup(env, nameRef.value()));
  } else {
    return new DynamicComponentReference({ nameRef, env });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates }) {
    super();

    // Process closure component
    let nameOrCell = args.positional.at(0);

    // This is always false!!
    if (isClosureComponentRef(nameOrCell)) {
      args = nameOrCell.value().args;
    }

    this.definition = new DynamicComponentLookup(args);
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
    return lookup(env, nameRef.value());
  }
}

function lookup(env, name) {
  if (typeof name === 'string') {
    let componentDefinition = env.getComponentDefinition([name]);
    assert(`Glimmer error: Could not find component named "${name}" (no component or template with that name was found)`, componentDefinition);

    return componentDefinition;
  } else {
    throw new Error(`Cannot render ${name} as a component`);
  }
}

