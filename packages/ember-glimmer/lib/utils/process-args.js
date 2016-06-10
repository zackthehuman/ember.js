import { CONSTANT_TAG } from 'glimmer-reference';
import { EvaluatedArgs, EvaluatedNamedArgs, EvaluatedPositionalArgs } from 'glimmer-runtime';
import assign from 'ember-metal/assign';
import { assert } from 'ember-metal/debug';
import EmptyObject from 'ember-metal/empty_object';
import { ARGS } from '../component';

// function mergeArgs(args, curriedArgs) {
//   if (!curriedArgs) {
//     return args;
//   }

//   let { named, positional } = args;
//   let curriedNamed = curriedArgs.named;
//   let curriedPositional = curriedArgs.positional;
//   let [...mergedPositional] = curriedPositional.values;

//   mergedPositional.splice(0, positional.values.length, ...positional.values);

//   let mergedNamed = assign({}, curriedNamed.map, named.map);

//   return EvaluatedArgs.create({
//     named: EvaluatedNamedArgs.create({
//       map: mergedNamed
//     }),
//     positional: EvaluatedPositionalArgs.create({
//       values: mergedPositional
//     })
//   });
// }

function validatePositionalParameters(args, positionalParamsDefinition) {
  let paramType = typeof positionalParamsDefinition;

  if (paramType === 'string') {
    assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !args.named.has(positionalParamsDefinition));
  } else {
    if (args.positional.length < positionalParamsDefinition.length) {
      positionalParamsDefinition = positionalParamsDefinition.slice(0, args.positional.length);
    }

    for (let i = 0; i < positionalParamsDefinition.length; i++) {
      let name = positionalParamsDefinition[i];

      assert(
        `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
        !args.named.has(name)
      );
    }
  }
}

export default function processArgs(args, positionalParamsDefinition) {
  let curriedArgs = args.internal && args.internal['args'];
  let hasPositional = args.positional.length;

  // This will check each layer of args for conflicts between positional and named args.
  if (curriedArgs) {
    for (let i = 0; i < curriedArgs.length; i++) {
      if (positionalParamsDefinition) {
        validatePositionalParameters(curriedArgs[i], positionalParamsDefinition);
        hasPositional = hasPositional || curriedArgs[i].positional.length;
      }
    }
  } else {
    currentArgs = EvaluatedArgs.empty();
  }
    /*
    if (positionalParamsDefinition) {

      // TODO: For each layer, validate and then *APPLY* the positional params.
      // Then each layer can be merged.

      for (let i = 0; i < curriedArgs.length; i++) {
        validatePositionalParameters(curriedArgs[i], positionalParamsDefinition);
      }
    }

    let mergedNamed = assign({}, ...curriedArgs.map( argObj => argObj.named.map ), args.named.map);
    let mergedPositional = [...curriedArgs.map( argObj => argObj.positional.values ), args.positional.values].reduce(function(prev, curr) {
      let [...merged] = prev;
      merged.splice(0, curr.length, ...curr);
      return merged;
    }, []);
    */

    /*
    mergedArgs = EvaluatedArgs.create({
      named: EvaluatedNamedArgs.create({
        map: mergedNamed
      }),
      positional: EvaluatedPositionalArgs.create({
        values: mergedPositional
      })
    });
    */

  if (!positionalParamsDefinition || positionalParamsDefinition.length === 0 || hasPositional === 0) {
    return SimpleArgs.create(args, curriedArgs);
  } else if (typeof positionalParamsDefinition === 'string') {
    return RestArgs.create(args, curriedArgs, positionalParamsDefinition);
  } else {
    return PositionalArgs.create(args, curriedArgs, positionalParamsDefinition);
  }
}

const EMPTY_ARGS = {
  tag: CONSTANT_TAG,

  value() {
    return { attrs: {}, props: { attrs: {}, [ARGS]: {} } };
  }
};

class SimpleArgs {
  static create({ named }, curriedArgs) {
    let mergedRaw = assign({}, ...curriedArgs.map( argObj => argObj.named.map ), named.map);

    if (Object.keys(mergedRaw).length === 0) {
      return EMPTY_ARGS;
    } else {
      return new SimpleArgs(
        EvaluatedNamedArgs.create({
          map: mergedRaw
        })
      );
    }
  }

  constructor(namedArgs) {
    this.tag = namedArgs.tag;
    this.namedArgs = namedArgs;
  }

  value() {
    let { namedArgs } = this;
    let keys = namedArgs.keys;
    let attrs = namedArgs.value();
    let props = new EmptyObject();
    let args = new EmptyObject();

    props.attrs = attrs;
    props[ARGS] = args;

    for (let i = 0, l = keys.length; i < l; i++) {
      let name = keys[i];
      let value = attrs[name];

      args[name] = namedArgs.get(name);
      props[name] = value;
    }

    return { attrs, props };
  }
}

class RestArgs {
  static create(args, curriedArgs, restArgName) {
    validatePositionalParameters(args, restArgName);

    // Merge positional args, pass named args through.
    let mergedPositionalArgs = EvaluatedArgs.create({
      named: args.named,
      positional: EvaluatedPositionalArgs.create({
        values: [...curriedArgs.map( argObj => argObj.positional.values ), args.positional.values].reduce(function(prev, curr) {
          let [...merged] = prev;
          merged.splice(0, curr.length, ...curr);
          return merged;
        }, [])
      })
    });

    return new RestArgs(mergedPositionalArgs, curriedArgs, restArgName);
  }

  constructor(args, curriedArgs, restArgName) {
    this.tag = args.tag;
    this.simpleArgs = SimpleArgs.create(args, curriedArgs);
    this.positionalArgs = args.positional;
    this.restArgName = restArgName;
  }

  value() {
    let { simpleArgs, positionalArgs, restArgName } = this;

    let result = simpleArgs.value();

    result.props[ARGS] = positionalArgs;
    result.attrs[restArgName] = result.props[restArgName] = positionalArgs.value();

    return result;
  }
}


class PositionalArgs {
  static create(args, curriedArgs, positionalParamNames) {
    validatePositionalParameters(args, positionalParamNames);

    // TODO: Merge w/ curried args.
    // We don't merge the values, just the references. The result is basically
    // named args whose references point to the correct positional args.
    let mergedNamedArgs = {};

    // For each set of args to curry...
    for (let i = 0; i < curriedArgs.length; i++) {
      let currentArgs = curriedArgs[i];
      let { named, positional } = currentArgs;

      // First we apply the named args, unchanged.
      assign(mergedNamedArgs, named.map);

      // Then we check if any positional args from this set apply...
      for (let j = 0; j < positionalParamNames.length; j++) {
        let name = positionalParamNames[j];
        mergedNamedArgs[name] = positional.at(j);
        //let reference = result.props[ARGS][name] = positionalArgs.at(j);
        //result.attrs[name] = result.props[name] = reference.value();
      }
    }

    if (args.positional.length > 0) {
      let length = args.positional.length < positionalParamNames.length ? args.positional.length : positionalParamNames.length; // Math.min?
      for (let i = 0; i < length; i++) {
        let name = positionalParamNames[i];
        let reference = args.positional.at(i);
        mergedNamedArgs[name] = reference;
      }
    }

    let mergedNamedStampedOverArgs = EvaluatedArgs.create({
      named: EvaluatedNamedArgs.create({
        map: mergedNamedArgs
      }),
      positional: args.positional
    });

    return new PositionalArgs(args, mergedNamedStampedOverArgs, positionalParamNames);
  }

  constructor(args, curriedArgs, positionalParamNames) {
    this.tag = curriedArgs.tag; // need a better tag here; need a tag of curried and non-curried args?
    this.simpleArgs = SimpleArgs.create(args, [curriedArgs]);
    this.positionalArgs = args.positional;
    this.positionalParamNames = positionalParamNames;
  }

  value() {
    let { simpleArgs, positionalArgs, positionalParamNames } = this;

    let result = simpleArgs.value();

    for (let i = 0; i < positionalParamNames.length; i++) {
      let name = positionalParamNames[i];
      let reference = result.props[ARGS][name] = simpleArgs.namedArgs.get(name);
      result.attrs[name] = result.props[name] = reference.value();
    }

    return result;
  }
}
