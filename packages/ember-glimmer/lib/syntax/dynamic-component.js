import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst, UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { isClosureComponent } from '../helpers/component';

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
    let name = nameRef.value();

    if (isClosureComponent(name)) {
      name = name.getName();

      // At this point we can call name.getArgs() to get the curried args.
      // We can construct an EvaluatedArgs from the `named` and `positional` properties.
      // Then they need to be merged with the invocation args.
    }

    let definition = env.getComponentDefinition([name]);
    assert(`Glimmer error: Could not find component named "${name}" (no component or template with that name was found)`, definition);
    return definition;
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
