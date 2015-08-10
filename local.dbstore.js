/**
 * @license LocalDbStore v0.1.2
 * (c) 2015 Nicu Ciocan, https://github.com/nicu
 * License: MIT
 */
(function(window, angular, undefined) {
    'use strict';

    angular.module('LocalDbStore', [])
      .factory('FixtureStore', function() {
        var __local_store = {};

        // private map of all relations between collections
        var relations = {};

        var FixtureStore = {};

        FixtureStore.get = function(name) {
          return JSON.parse(localStorage[name] || '[]');
        };
        FixtureStore.set = function(name, value) {
          localStorage[name] = JSON.stringify(value);
        };

        FixtureStore.clear = function() {
          localStorage.clear();
        };

        FixtureStore.genId = function(items) {
          var ids = items.map(function(item) {
            return item.id || 0;
          });

          // just in case there were no items in our collection
          // assume we have a 'max' id of 0
          ids.push(0);

          return Math.max.apply(Math, ids) + 1;
        };

        FixtureStore.findIndex = function(filter, items) {
          var keys = Object.keys(filter),
            index = -1;

          items.some(function(item, i) {
            return keys.reduce(function matchItem(match, key) {
              var isMatch = (match && (item[key] === filter[key]));

              if (isMatch) {
                index = i;
              }

              return isMatch;
            }, true);
          });

          // no item found
          return index;
        };

        /**
         * NOTE: the association loading goes only 1 level deep
         * when used inside the Fixture store, it will be called
         * recursively for the other levels
         */
        FixtureStore.parseAssociations = function(includes) {
          return includes.map(function(collectionName) {
            var keys, name, deps = [];

            if (typeof collectionName === 'string') {
              name = collectionName;
            }
            else {
              keys = Object.keys(collectionName);
              name = keys[0];
              deps = collectionName[keys[0]];
            }

            return {
              name: name,
              deps: deps
            };
          });
        };

        FixtureStore.loadAssociations = function(name, item, associations) {
          var self = this;
          angular.forEach(associations, function(assoc) {
            var where = {},
              bToAssoc = relations[assoc.name] ? relations[assoc.name].belongsTo : [];

            angular.forEach(bToAssoc, function(bTo) {
              var k = Object.keys(bTo);
              if (k[0] === name) {
                where[bTo[k[0]]] = item.id;
              }
            });

            item[assoc.name] = self.findAll(assoc.name, where, {include: assoc.deps});
          });
        };

        FixtureStore.create = function(name, _data) {
          var items = this.get(name),
            data = angular.isString(_data) ? angular.fromJson(_data) : _data;

          // initialise an empty array if no data exists for the store
          if (!items) {
            items = [];
          }

          // assign a newly generated id for the data
          data.id = this.genId(items);

          items.push(data);
          // persist the collection
          this.set(name, items);

          return data;
        };

        FixtureStore.update = function(name, filter, _item) {
          var items = this.get(name),
            index = FixtureStore.findIndex(filter, items),
            item = angular.isString(_item) ? angular.fromJson(_item) : _item;

          if (index === -1) {
            // TODO let it crash?
            return false;
          }

          // replace the item in the collection
          items[index] = item;
          // persist the updated collection
          this.set(name, items);

          return true;
        };


        FixtureStore.findAll = function(name, filter, options) {
          var self = this,
            keys = Object.keys(filter || {}),
            opts = options || {},
            associations = this.parseAssociations(opts.include || []);

          return this.get(name).filter(function(item) {
            self.loadAssociations(name, item, associations);

            return keys.reduce(function(isMatch, key) {
              return isMatch && (item[key] === filter[key]);
            }, true);
          });
        };

        FixtureStore.findOne = function(name, filter, options) {
          var items = this.get(name),
            index = this.findIndex(filter, items),
            item = items[index],
            opts = options || {},
            associations = this.parseAssociations(opts.include || []);

          this.loadAssociations(name, item, associations);

          return item;
        };

        FixtureStore.remove = function(name, filter) {
          var items = this.get(name),
            index = this.findIndex(filter, items);

          if (index > -1) {
            // remove the item from the collection
            items.splice(index, 1);
            // persist the updated collection
            this.set(name, items);
          }

          return true;
        };

        FixtureStore.belongsTo = function(name, def) {
          relations[name] = relations[name] || {};
          relations[name].belongsTo = def;
        };

        return FixtureStore;
      })

      .factory('localDbStore', function(FixtureStore) {
        var localDbStore = function(name) {
          var result = {};

          angular.forEach(['create', 'update', 'remove', 'findOne', 'findAll'], function(method) {
            result[method] = function() {
              var args = Array.prototype.slice.apply(arguments);
              return FixtureStore[method].apply(FixtureStore, [name].concat(args));
            };
          });

          result.belongsTo = function(def) {
            return FixtureStore.belongsTo(name, def);
          };

          return result;
        };

        localDbStore.clear = FixtureStore.clear;

        return localDbStore;
      });
})(window, window.angular);