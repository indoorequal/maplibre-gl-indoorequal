export default class LevelControl {
  constructor(indoorequal) {
    this.indoorequal = indoorequal;
    this._cbRefresh = () => this._refresh();
    this.indoorequal.on('levelschange', this._cbRefresh);
    this.indoorequal.on('levelchange', this._cbRefresh);

    this.$el = document.createElement('div');
    this.$el.classList.add('mapboxgl-ctrl', 'mapboxgl-ctrl-group', 'mapboxgl-ctrl-indoorequal');
    this._refresh();
  }

  destroy() {
    this.$el.remove();
    this.indoorequal.off('levelschange', this._cbRefresh);
    this.indoorequal.off('levelchange', this._cbRefresh);
  }

  _refresh() {
    this.$el.innerHTML = '';
    this.indoorequal.levels.forEach((level) => {
      const button = document.createElement('button');
      const strong = document.createElement('strong');
      strong.textContent = level;
      button.appendChild(strong);
      if (level == this.indoorequal.level) {
        button.classList.add('mapboxgl-ctrl-active');
      }
      button.addEventListener('click', () => {  this.indoorequal.setLevel(level); })
      this.$el.appendChild(button);
    });
  }
}
