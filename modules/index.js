import {
  loop,
} from './loop';

import {
  batch,
  none,
  constant,
  promise,
  map,
} from './effects';

import {
  install,
} from './install';

import {
  combineReducers,
} from './combineReducers';


const Effects = {
  constant,
  promise,
  batch,
  none,
  map,
};

export {
  combineReducers,
  Effects,
  install,
  loop,
};
