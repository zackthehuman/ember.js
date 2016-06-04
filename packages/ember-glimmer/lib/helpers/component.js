import { CachedReference } from '../utils/references';
import { NULL_REFERENCE, UNDEFINED_REFERENCE } from 'glimmer-runtime';
import EmberError from 'ember-metal/error';
import assign from 'ember-metal/assign';
import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';

const CLOSURE_COMPONENT = 'ba564e81-ceda-4475-84a7-1c44f1c42c0e';

export function isClosureComponent(object) {
  return object && !!object[CLOSURE_COMPONENT];
}

export class ClosureComponentReference extends CachedReference {
  static create(args) {
    return new ClosureComponentReference(args);
  }

  constructor(args) {
    super();

    this.args = args;
    this.tag = args.tag;
  }

  compute() {
    return ClosureComponent.create(this.args);
  }
}

class ClosureComponent {
  static create(args) {
    return new ClosureComponent(args);
  }

  constructor(args) {
    this[CLOSURE_COMPONENT] = true;
    this.args = args;
  }

  getName() {
    let parentOrName = this.args.positional.at(0).value();

    if (isClosureComponent(parentOrName)) {
      return parentOrName.getName();
    }

    return parentOrName;
  }

  getArgs() {
    let { named, positional } = this.args;
    let namedMap = named.map;
    let positionalValues = positional.values;
    let parent = this.args.positional.at(0).value();

    if (isClosureComponent(parent)) {
      let parentArgs = parent.getArgs();
      let [...mergedPositional] = parentArgs.positional;

      mergedPositional.splice(0, positionalValues.length, ...positionalValues);

      return {
        named: assign({}, namedMap, parentArgs.named),
        positional: mergedPositional
      };
    }

    return {
      named: namedMap,
      positional: positionalValues
    };
  }
}

export default {
  isInternalHelper: true,

  toReference(args) {
    return ClosureComponentReference.create(args);
  }
};
