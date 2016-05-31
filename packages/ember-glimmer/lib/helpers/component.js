import { assert } from 'ember-metal/debug';
import { InternalHelperReference } from '../utils/references';
import assign from 'ember-metal/assign';
import { EvaluatedNamedArgs } from 'glimmer-runtime';

export const CLOSURE_COMPONENT = 'ba564e81-ceda-4475-84a7-1c44f1c42c0e';

export function isClosureComponent(obj) {
  return !!obj[CLOSURE_COMPONENT];
}

class ClosureComponent {
  static create({ args, parent }) {
    return new ClosureComponent(...arguments);
  }

  constructor({ args, parent }) {
    this[CLOSURE_COMPONENT] = true;
    this.args = args;
    this.parent = parent;
  }

  name() {
    if (this.parent) {
      return this.parent.name();
    }

    return this.args.positional.at(0);
  }

  curriedArgs() {
    let { parent, args } = this;

    let parentCurriedArgs = parent ? parent.curriedArgs() : null;
    let namedArgs = args.named;

    if (parentCurriedArgs !== null) {
      let combinedArgs = EvaluatedNamedArgs.create({
        map: assign({}, parentCurriedArgs.map, namedArgs.map)
      });

      return combinedArgs;
    } else {
      return namedArgs;
    }
  }
}

function componentHelper(args) {
  let { positional } = args;
  let firstArg = positional.at(0).value();
  let parent;

  assert(
    'Component path cannot be null in component helper',
    firstArg
  );

  if (isClosureComponent(firstArg)) {
    parent = firstArg;
  }

  return ClosureComponent.create({
    args,
    parent
  });
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(componentHelper, args);
  }
};
