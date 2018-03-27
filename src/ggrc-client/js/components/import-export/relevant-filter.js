/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/relevant-filter.mustache';

export default can.Component.extend({
  tag: 'relevant-filter',
  template,
  viewModel: {
    define: {
      disableCreate: {
        type: 'boolean',
        value: false,
      },
    },
    relevant_menu_item: '@',
    show_all: '@',
    addFilter: function () {
      let menu = this.menu();

      if (this.attr('relevant_menu_item') === 'parent' &&
           Number(this.attr('panel_index')) !== 0 &&
           !this.attr('has_parent')) {
        menu.unshift({
          title_singular: 'Previous objects',
          model_singular: '__previous__',
        });
      }

      this.attr('relevant').push({
        value: false,
        filter: new can.Map(),
        textValue: '',
        menu: menu,
        model_name: menu[0].model_singular,
      });
    },
    menu: function () {
      let type = this.attr('type');
      let mappings;
      let models;
      if (/true/i.test(this.attr('show_all'))) {
        // find all widget types and manually add Cycle since it's missing
        // convert names to CMS models and prune invalid (undefined)
        models = can.Map.keys(GGRC.tree_view.base_widgets_by_type);
        models = _.difference(_.unique(models),
          ['CycleTaskEntry', 'CycleTaskGroupObject']);
        models = _.map(models, function (mapping) {
          return CMS.Models[mapping];
        });
        return _.sortBy(_.compact(models), 'model_singular');
      }
      mappings = GGRC.Mappings.get_canonical_mappings_for(type);
      return _.sortBy(_.compact(_.map(_.keys(mappings), function (mapping) {
        return CMS.Models[mapping];
      })), 'model_singular');
    },
    optionHidden: function (option) {
      let type = option.model_singular;
      return can.makeArray(this.attr('relevantTo'))
        .some(function (item) {
          return item.readOnly && item.type === type;
        });
    },
    removeFilter(el, index) {
      this.attr('relevant').splice(index, 1);
    },
  },
  events: {
    init: function () {
      this.setRelevant();
    },
    setRelevant: function () {
      this.viewModel.attr('relevant').replace([]);
      can.each(this.viewModel.attr('relevantTo') || [], function (item) {
        let model = new CMS.Models[item.type](item);
        this.viewModel.attr('relevant').push({
          readOnly: item.readOnly,
          value: true,
          filter: model,
          textValue: '',
          menu: this.viewModel.attr('menu'),
          model_name: model.constructor.shortName,
        });
      }, this);
    },
    '.ui-autocomplete-input autocomplete:select': function (el, ev, data) {
      let index = el.data('index');
      let panel = this.viewModel.attr('relevant')[index];
      let textValue = el.data('ggrc-autocomplete').term;

      panel.attr('filter', data.item.attr());
      panel.attr('value', true);
      panel.attr('textValue', textValue);
    },
    '.ui-autocomplete-input input': function (el, ev, data) {
      let index = el.data('index');
      let panel = this.viewModel.attr('relevant')[index];

      panel.attr('value', false);
      panel.attr('textValue', el.val());
    },
    '{viewModel.relevant} change': function (list, item, which) {
      this.viewModel.attr('has_parent',
        _.findWhere(this.viewModel.attr('relevant'),
          {model_name: '__previous__'}));
      if (!/model_name/gi.test(which)) {
        return;
      }
      item.target.attr('filter', new can.Map());
      item.target.attr('value', false);
    },
  },
});