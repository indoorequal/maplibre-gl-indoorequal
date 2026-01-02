import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import LevelControl from '../src/level_control.js';

describe('LevelControl', () => {
  let indoorEqual;
  let events;

  beforeEach(() => {
    events = {};
    indoorEqual = {
      level: '0',
      levels: [],
      on(eventName, fn) { events[eventName] = fn; },
      off() {}
    };
  });

  it('create a container', () => {
    const control = new LevelControl(indoorEqual);
    assert.notEqual(control.$el, null);
    assert.equal(control.$el.classList.contains('maplibregl-ctrl'), true);
    assert.equal(control.$el.classList.contains('maplibregl-ctrl-group'), true);
    assert.equal(control.$el.classList.contains('maplibregl-ctrl-indoorequal'), true);
  });

  it('render the levels as button', () => {
    const levels = ['1', '0'];
    indoorEqual.levels = levels;
    const control = new LevelControl(indoorEqual);
    assert.equal(control.$el.querySelectorAll('button').length, 2);
    assert.equal(control.$el.querySelectorAll('button.maplibregl-ctrl-active').length, 1);
    assert.equal(control.$el.querySelector('button.maplibregl-ctrl-active').textContent, '0')
  });

  it('refresh the control when the levels change', () => {
    const levels = ['2', '1', '0'];
    const control = new LevelControl(indoorEqual);
    indoorEqual.levels = levels;
    events.levelschange(indoorEqual);
    assert.equal(control.$el.querySelectorAll('button').length, 3);
  });

  it('a click on the button update the level', () => {
    indoorEqual.levels = ['1', '0'];
    indoorEqual.setLevel = mock.fn();
    const control = new LevelControl(indoorEqual);
    control.$el.querySelectorAll('button')[1].click();
    assert.equal(indoorEqual.setLevel.mock.calls.length, 1);
  });

  it('refresh the control when the current level change', () => {
    const levels = ['1', '0'];
    indoorEqual.levels = levels;
    const control = new LevelControl(indoorEqual);
    indoorEqual.level = '1';
    events.levelchange('1');
    assert.equal(control.$el.querySelectorAll('button.maplibregl-ctrl-active').length, 1);
    assert.equal(control.$el.querySelector('button.maplibregl-ctrl-active').textContent, '1');
  });

  it('remove the container and listener when calling destroy', () => {
    const control = new LevelControl(indoorEqual);
    let callRemove = 0;
    control.$el.remove = () => callRemove ++;
    indoorEqual.off = mock.fn();
    control.destroy();
    assert.equal(callRemove, 1);
    assert.equal(indoorEqual.off.mock.calls.length, 2);
  });
});
