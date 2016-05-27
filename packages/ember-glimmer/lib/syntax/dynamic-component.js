import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { isClosureComponentRef } from '../helpers/component';

class DynamicComponentLookup {
  constructor(args, isBlock) {
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));
    this.factory = (args, options) => dynamicComponentFor(args, options, isBlock);
  }
}

// function isComponentHelper(syntax) {
//   return syntax.type === 'helper' && syntax.ref && syntax.ref.parts && syntax.ref.parts[0] === 'component';
// }

// function extractComponentNameReference(args) {
//   debugger;
//   let nameRef = args.positional.at(0);

//   if (isClosureComponentRef(nameRef)) {
//     nameRef = nameRef.value().args.positional.at(0);
//   }

//   return nameRef;
// }

function dynamicComponentFor(args, { env }, isBlock) {
  let nameRef = args.positional.at(0); //extractComponentNameReference(args);

  if (isConst(nameRef)) {
    return new ConstReference(lookup(env, nameRef.value(), isBlock));
  } else {
    return new DynamicComponentReference({ nameRef, env, isBlock });
  }
}

export class DynamicComponentSyntax extends StatementSyntax {
  constructor({ args, templates, isBlock }) {
    super();

    // Process closure component
    // let nameOrHelper = args.positional.at(0);

    // if (isComponentHelper(nameOrHelper)) {
    //   args = nameOrHelper.args;
    // }

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
    let maybeName = nameRef.value();
    let curriedArgs;

    if (isClosureComponentRef(maybeName)) {
      console.log('Got a closure component!');
      name = maybeName.resolveComponentName().value();
      curriedArgs = maybeName.resolveCurriedArgs();
      debugger;
    } else {
      name = nameRef.value();
    }

    return lookup(env, name, isBlock, curriedArgs);
  }
}

function lookup(env, name, isBlock, curriedArgs) {
  if (typeof name === 'string') {
    let componentDefinition = env.createComponentDefinition([name], isBlock);
    assert(`Glimmer error: Could not find component named "${name}" (no component or template with that name was found)`, componentDefinition);

    componentDefinition.curriedArgs = curriedArgs;

    return componentDefinition;
  } else {
    throw new Error(`Cannot render ${name} as a component`);
  }
}

