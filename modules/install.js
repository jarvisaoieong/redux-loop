import { throwInvariant } from './utils';

import {
  loop,
  isLoop,
} from './loop';

import {
  batch,
  none,
  isEffect,
  effectToPromise,
} from './effects';

import createLogger from './createLogger';

/**
 * Lifts a state to a looped state if it is not already.
 */
function liftState(state) {
  return isLoop(state) ?
    state :
    loop(state, none());
}

/**
 * Lifts a reducer to always return a looped state.
 */
function liftReducer(reducer) {
  return (state, action) => {
    const result = reducer(state.model, action);
    return liftState(result);
  };
}

/**
 * Installs a new dispatch function which will attempt to execute any effects
 * attached to the current model as established by the original dispatch.
 */
export function install({logger} = {}) {
  return (next) => (reducer, initialState) => {
    const liftedInitialState = liftState(initialState);
    const store = next(liftReducer(reducer), liftedInitialState);

    let __dispatch;

    if (logger) {
      __dispatch = createLogger(logger)(store)(store.dispatch);
    } else {
      __dispatch = store.dispatch;
    }

    function dispatch(action, originalActions = []) {
      __dispatch(action, originalActions);
      const { effect } = store.getState();
      return runEffect(effect, originalActions.concat(action)).then(() => {});
    }

    function runEffect(effect, originalActions = []) {
      return effectToPromise(effect)
        .then((actions) => {
          const materializedActions = [].concat(actions).filter(a => a);
          return Promise.all(materializedActions.map((action) => dispatch(action, originalActions)));
        })
        .catch((error) => {
          const originalActionTypes = originalActions.map((action) => action.type).join(' > ');
          console.error(
            `loop Promise caught when returned from action of type "${originalActionTypes}".` +
            '\nloop Promises must not throw!'
          );
          throw error;
        });
    }

    function getState() {
      return store.getState().model;
    }

    function replaceReducer(r) {
      return store.replaceReducer(liftReducer(r));
    }

    runEffect(liftedInitialState.effect, [{ type: "@@ReduxLoop/INIT" }]);

    return {
      ...store,
      getState,
      dispatch,
      replaceReducer,
    };
  };
}
