import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { isClosureComponent } from '../helpers/component';

class DynamicComponentLookup {
  constructor(args, isBlock) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = (args, options) => dynamicComponentFor(args, options, isBlock);
  }
}

function dynamicComponentFor(args, { env }, isBlock) {
  let nameRef = args.positional.at(0);

  if (isConst(nameRef)) {
    return new ConstReference(lookup(env, nameRef.value(), isBlock));
  } else {
    return new DynamicComponentReference({ nameRef, env, isBlock });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates, isBlock }) {
    super();

    this.definition = new DynamicComponentLookup(args, isBlock);
    this.args = ArgsSyntax.build(args.positional.slice(1), args.named);
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class DynamicComponentReference {
  constructor({ nameRef, env, isBlock }) {
    this.nameRef = nameRef;
    this.env = env;
    this.tag = nameRef.tag;
    this.isBlock = isBlock;
  }

  value() {
    let { env, nameRef, isBlock } = this;
    return lookup(env, nameRef.value(), isBlock);
  }
}

function lookup(env, name, isBlock) {
  let nameType = typeof name;

  if (nameType === 'string') {
    let componentDefinition = env.createComponentDefinition([name], isBlock);
    assert(`The component helper cannot be used without a valid component name. You used \"${name}\" via (component \"${name}\")`, componentDefinition);

    return componentDefinition;
  } else if (isClosureComponent(name)) {
    let componentName = name.name().value();
    let componentDefinition = env.createComponentDefinition([componentName], isBlock);
    assert(`The component helper cannot be used without a valid component name. You used \"${componentName}\" via (component \"${componentName}\")`, componentDefinition);

    componentDefinition.curriedArgs = name.curriedArgs();

    return componentDefinition;
  } else {
    throw new Error(`Cannot render ${name} as a component`);
  }
}

