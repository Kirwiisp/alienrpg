import { yze } from '../YZEDiceRoller.js';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ActorSheetAlienRPGTerritory extends ActorSheet {
  constructor(...args) {
    super(...args);

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {
      planetsystem: new Set(),
      // spellbook: new Set(),
      // features: new Set()
    };
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['alienrpg', 'sheet', 'actor', 'territory'],
      // template: 'systems/alienrpg/templates/actor/vehicles-sheet.html',
      width: 650,
      height: 650,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'general' }],
    });
  }

  get template() {
    const path = 'systems/alienrpg/templates/actor/';
    return `${path}territory-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // const data = super.getData();
    // Basic data
    let isOwner = this.entity.owner;
    const data = {
      owner: isOwner,
      limited: this.entity.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: isOwner ? 'editable' : 'locked',
      isCharacter: this.entity.data.type === 'character',
      isVehicles: this.entity.data.type === 'vehicles',
      isCreature: this.entity.data.type === 'creature',

      config: CONFIG.ALIENRPG,
    };

    // The Actor and its Items
    data.actor = duplicate(this.actor.data);
    data.items = this.actor.items.map((i) => {
      i.data.labels = i.labels;
      return i.data;
    });
    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.data = data.actor.data;
    data.labels = this.actor.labels || {};
    data.filters = this._filters;

    // Return data to the sheet
    this._prepareItems(data); // Return data to the sheet

    return data;
  }

  _findActiveList() {
    return this.element.find('.tab.active .directory-list');
  }
  _filterItems(items, filters) {
    return items.filter((item) => {
      const data = item.data;

      // Action usage
      // for (let f of ['action', 'bonus', 'reaction']) {
      //   if (filters.has(f)) {
      //     if (data.activation && data.activation.type !== f) return false;
      //   }
      // }

      // // Spell-specific filters
      // if (filters.has('ritual')) {
      //   if (data.components.ritual !== true) return false;
      // }
      // if (filters.has('concentration')) {
      //   if (data.components.concentration !== true) return false;
      // }
      // if (filters.has('prepared')) {
      //   if (data.level === 0 || ['innate', 'always'].includes(data.preparation.mode)) return true;
      //   if (this.actor.data.type === 'npc') return true;
      //   return data.preparation.prepared;
      // }

      // Equipment-specific filters
      if (filters.has('equipped')) {
        if (data.equipped !== true) return false;
      }
      return true;
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click((ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.getOwnedItem(li.data('itemId'));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click((ev) => {
      const li = $(ev.currentTarget).parents('.item');
      this.actor.deleteOwnedItem(li.data('itemId'));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    // html.find('.rollable').click(this._onRoll.bind(this));

    // html.find('.rollable').contextmenu(this._onRollMod.bind(this));

    // // Rollable Items.
    // html.find('.rollItem').click(this._rollItem.bind(this));

    // html.find('.rollItem').contextmenu(this._onRollItemMod.bind(this));

    // // minus from health and stress
    // html.find('.minus-btn').click(this._minusButton.bind(this));

    // // plus tohealth and stress
    // html.find('.plus-btn').click(this._plusButton.bind(this));

    // html.find('.click-stat-level').on('click contextmenu', this._onClickStatLevel.bind(this)); // Toggle Dying Wounded

    // html.find('.supply-btn').click(this._supplyRoll.bind(this));

    // // Roll handlers, click handlers, etc. would go here.
    // html.find('.currency').on('change', this._currencyField.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = (ev) => this._onDragItemStart(ev);
      // Find all items on the character sheet.
      html.find('li.item').each((i, li) => {
        // Ignore for the header row.
        if (li.classList.contains('item-header')) return;
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data['type'];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  _prepareItems(data) {
    const systems = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of data.items) {
      let item = i.data;
      // Append to gear.
      if (i.type === 'planet-system') {
        systems.push(i);
      }
    }

    // Assign and return
    data.systems = systems;

    // Categorize items as inventory, spellbook, features, and classes
    //   const systems = {
    //     planetsystem: { label: 'Planet-System', items: [], dataset: { type: 'planet-system' } },
    //     // item: { label: 'Items', items: [], dataset: { type: 'item' } },
    //     // armor: { label: 'Armor', items: [], dataset: { type: 'armor' } },
    //   };
    //   // Partition items by category
    //   let [items, spells, feats, classes] = data.items.reduce(
    //     (arr, item) => {
    //       // Item details
    //       item.img = item.img || DEFAULT_TOKEN;
    //       item.isStack = item.data.quantity ? item.data.quantity > 1 : false;

    //       // console.warn('inventory', inventory);

    //       // Classify items into types
    //       if (item.type === 'spell') arr[1].push(item);
    //       else if (item.type === 'feat') arr[2].push(item);
    //       else if (item.type === 'class') arr[3].push(item);
    //       else if (Object.keys(systems).includes(item.type)) arr[0].push(item);
    //       return arr;
    //     },
    //     [[], [], [], []]
    //   );

    //   // Apply active item filters
    //   items = this._filterItems(items, this._filters.systems);

    //   // // Organize Inventory
    //   // let totalWeight = 0;
    //   // for (let i of items) {
    //   //   //  i.data.quantity = i.data.quantity || 0;
    //   //   i.data.attributes.weight.value = i.data.attributes.weight.value || 0;
    //   //   i.totalWeight = i.data.attributes.weight.value;
    //   //   inventory[i.type].items.push(i);
    //   //   totalWeight += i.totalWeight;
    //   // }

    //   // Assign and return
    //   data.systems = Object.values(systems);
  }
}
export default ActorSheetAlienRPGTerritory;