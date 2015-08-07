(function() {
  'use strict';

  describe('dbStore/FixtureStore', function() {
    var FixtureStore, dbStore;

    beforeEach(module('localDbStore'));

    beforeEach(inject(function(_FixtureStore_, _dbStore_) {
      FixtureStore = _FixtureStore_;
      dbStore = _dbStore_;
    }));

    afterEach(function() {
      FixtureStore.clear();
    });

    describe('FixtureStore', function() {
      it('should generate the first id', function() {
        expect(FixtureStore.genId([])).toEqual(1);
      });

      it('should generate new id based on the highest existent id', function() {
        expect(FixtureStore.genId([{id: 1}, {id: 7}, {id: 6}])).toEqual(8);
      });

      it('should return the index of an item inside a given collection', function() {
        expect(FixtureStore.findIndex({id: 1}, [{id: 1}, {id: 7}, {id: 6}])).toEqual(0);
      });

      it('should return -1 if an item does not exist in a given collection', function() {
        expect(FixtureStore.findIndex({id: 10}, [{id: 1}, {id: 7}, {id: 6}])).toEqual(-1);
      });

      it('should return the associations and their dependencies', function() {
        var assoc = FixtureStore.parseAssociations(['first', {'second': ['third', {'fourth': ['fifth', 'sixth']}]}]);

        expect(assoc.length).toBe(2);

        // first dependency doesn't have any other nested dependencies
        expect(assoc[0].name).toEqual('first');
        expect(assoc[0].deps.length).toBe(0);

        // second dependency has 2 nested dependencies: `third` and `fourth`
        expect(assoc[1].name).toEqual('second');
        expect(assoc[1].deps.length).toBe(2);
      });
    });


    describe('dbStore', function() {
      it('should create a new item', function() {
        var item = dbStore('collection').create({
          name: 'New Item'
        });

        expect(item).toEqual({
          id: 1,
          name: 'New Item'
        });
      });

      describe('Existing store data', function() {
        beforeEach(function() {
          FixtureStore.set('collection', [{
            id: 1,
            name: 'First item',
            group: 'A'
          }, {
            id: 2,
            name: 'Second item',
            group: 'B'
          }, {
            id: 3,
            name: 'Third item',
            group: 'A'
          }]);
        });

        it('should update an existing item', function() {
          var success = dbStore('collection').update({name: 'Second item'}, {
            id: 2,
            name: 'Updated'
          });
          expect(success).toBe(true);

          var item = dbStore('collection').findOne({id: 2});
          expect(item.name).toEqual('Updated');
        });

        it('should return false when item can\'t be updated', function() {
          var success = dbStore('collection').update({name: 'Inexistent'}, {
            name: 'This will never be updated'
          });

          expect(success).toBe(false);
        });

        it('should remove an item', function() {
          var items;

          // before
          items = dbStore('collection').findAll();
          expect(items.length).toBe(3);

          dbStore('collection').remove({id: 1});

          // after
          items = dbStore('collection').findAll();
          expect(items.length).toBe(2);
          expect(items[0].name).toEqual('Second item');
          expect(items[1].name).toEqual('Third item');
        });

        it('should return a specific item', function() {
          var item = dbStore('collection').findOne({id: 3});

          expect(item.name).toEqual('Third item');
        });

        it('should return undefined when item does not exist', function() {
          var item = dbStore('collection').findOne({id: 10});

          expect(item).not.toBeDefined();
        });

        it('should return all items', function() {
          var items = dbStore('collection').findAll();

          expect(items.length).toBe(3);
        });

        it('should return items that match criteria', function() {
          var groupA = dbStore('collection').findAll({group: 'A'});
          var groupB = dbStore('collection').findAll({group: 'B'});

          expect(groupA.length).toBe(2);
          expect(groupB.length).toBe(1);
        });

        describe('Nested resources', function() {
          beforeEach(function() {
            FixtureStore.set('nested', [{
              id: 1,
              collection_id: 1,
              name: 'First subitem'
            }, {
              id: 2,
              collection_id: 1,
              name: 'Second subitem'
            }, {
              id: 3,
              collection_id: 2,
              name: 'Third subitem'
            }]);

            FixtureStore.set('deeplyNested', [{
              id: 1,
              parent_id: 1,
              name: 'First deep subitem'
            }, {
              id: 2,
              parent_id: 1,
              name: 'Second deep subitem'
            }, {
              id: 3,
              parent_id: 2,
              name: 'Third deep subitem'
            }]);
          });

          describe('without associations', function() {
            it('should return all items containing nested resources', function() {
              var items = dbStore('collection').findAll({}, {include: [{'nested': ['deeplyNested']}]}),
                item = items[0];

              expect(items.length).toBe(3);
              expect(item.nested.length).toBe(3);
              expect(item.nested[0].deeplyNested.length).toBe(3);
            });

            it('should return one item containing nested resources', function() {
              var item = dbStore('collection').findOne({id: 1}, {include: [{'nested': ['deeplyNested']}]});

              expect(item.nested.length).toBe(3);
              expect(item.nested[0].deeplyNested.length).toBe(3);
            });
          });

          describe('with associations', function() {
            beforeEach(function() {
              dbStore('nested').belongsTo([{'collection': 'collection_id'}]);
              dbStore('deeplyNested').belongsTo([{'nested': 'parent_id'}]);
            });

            it('should return all items containing nested resources', function() {
              var items = dbStore('collection').findAll({}, {include: [{'nested': ['deeplyNested']}]});
              expect(items.length).toBe(3);

              expect(items[0].nested.length).toBe(2);
              expect(items[1].nested.length).toBe(1);
              expect(items[2].nested.length).toBe(0);

              expect(items[0].nested[0].deeplyNested.length).toBe(2);
              expect(items[0].nested[1].deeplyNested.length).toBe(1);
            });

            it('should return one item containing nested resources', function() {
              var item = dbStore('collection').findOne({id: 1}, {include: [{'nested': ['deeplyNested']}]});

              expect(item.nested.length).toBe(2);
              expect(item.nested[0].deeplyNested.length).toBe(2);
            });
          });
        });
      });
    });
  });
})();