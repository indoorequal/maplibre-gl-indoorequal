import LevelControl from '../src/level_control';

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
    expect(control.$el).not.toBe(null);
    expect(control.$el.classList.contains('mapboxgl-ctrl')).toBe(true);
    expect(control.$el.classList.contains('mapboxgl-ctrl-group')).toBe(true);
    expect(control.$el.classList.contains('mapboxgl-ctrl-indoorequal')).toBe(true);
  });

  it('render the levels as button', () => {
    const levels = ['1', '0'];
    indoorEqual.levels = levels;
    const control = new LevelControl(indoorEqual);
    expect(control.$el.querySelectorAll('button').length).toEqual(2);
    expect(control.$el.querySelectorAll('button.mapboxgl-ctrl-active').length).toEqual(1);
    expect(control.$el.querySelector('button.mapboxgl-ctrl-active').textContent).toEqual('0');
  });

  it('refresh the control when the levels change', () => {
    const levels = ['2', '1', '0'];
    const control = new LevelControl(indoorEqual);
    indoorEqual.levels = levels;
    events.levelschange(indoorEqual);
    expect(control.$el.querySelectorAll('button').length).toEqual(3);
  });

  it('a click on the button update the level', () => {
    indoorEqual.levels = ['1', '0'];
    indoorEqual.setLevel = jest.fn();
    const control = new LevelControl(indoorEqual);
    control.$el.querySelectorAll('button')[1].click();
    expect(indoorEqual.setLevel.mock.calls.length).toEqual(1);
  });

  it('refresh the control when the current level change', () => {
    const levels = ['1', '0'];
    indoorEqual.levels = levels;
    const control = new LevelControl(indoorEqual);
    indoorEqual.level = '1';
    events.levelchange('1');
    expect(control.$el.querySelectorAll('button.mapboxgl-ctrl-active').length).toEqual(1);
    expect(control.$el.querySelector('button.mapboxgl-ctrl-active').textContent).toEqual('1');
  });

  it('remove the container and listener when calling destroy', () => {
    const control = new LevelControl(indoorEqual);
    let callRemove = 0;
    control.$el.remove = () => callRemove ++;
    indoorEqual.off = jest.fn();
    control.destroy();
    expect(callRemove).toEqual(1);
    expect(indoorEqual.off.mock.calls.length).toEqual(2);
  });
});
