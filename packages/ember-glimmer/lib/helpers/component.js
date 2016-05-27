import { InternalHelperReference } from '../utils/references';
import assign from 'ember-metal/assign';
import { EvaluatedNamedArgs } from 'glimmer-runtime';

export const COMPONENT_HELPER_SYMBOL = 'ba564e81-ceda-4475-84a7-1c44f1c42c0e';

export function isClosureComponentRef(ref) {
  return !!ref[COMPONENT_HELPER_SYMBOL];
}

class ComponentHelperReference extends InternalHelperReference {
  constructor() {
    super(...arguments);
  }
}

function collapseNamedArgs(closureComponent) {
  // get parent's args
  // merge own args over it (clobber them!)
  let parentNamedArgs = closureComponent.parent ? collapseNamedArgs(closureComponent.parent) : null;
  let innerArgs = closureComponent.args.named;

  if (parentNamedArgs !== null) {
    let combinedArgs = EvaluatedNamedArgs.create({
      map: mergeInNewHash(parentNamedArgs.map, innerArgs.map)
    });
    debugger;
    return combinedArgs;
  } else {
    return innerArgs;
  }
}

function componentHelper(args) {
  let { positional } = args;
  let firstArg = positional.at(0).value();
  let parent;

  if (isClosureComponentRef(firstArg)) {
    parent = firstArg;
  }

  return {
    [COMPONENT_HELPER_SYMBOL]: true,
    args,
    parent,
    resolveComponentName() {
      if (this.parent) {
        return this.parent.resolveComponentName();
      }

      return this.args.positional.at(0);
    },
    resolveCurriedArgs() {
      return collapseNamedArgs(this);
    }
  };
}

export function mergeInNewHash(original, updates) {
  return assign({}, original, updates);
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new ComponentHelperReference(componentHelper, args);
  }
};
