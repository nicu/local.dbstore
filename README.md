# local.dbstore
Fixture store for Angular projects. All data is persisted in localStorage.

## Installation

You can install the library using **Bower**:
```sh
bower install local.dbstore
```

Or using **npm**:
```sh
npm install local.dbstore
```

## What is it?
`local.dbstore` is a service that will help you build a fully working UI prototype for your clients, without the need of a real database.

It knows how to manage collections and simple associations like **one-to-many**.  
All the changes are persisted using `localStorage`.

### NOTE
The store automatically adds an integer `id` property to every collection and it autoincrements it as needed.

## Getting started

## CRUD Example

If we have a `User` resource:
```js
angular.module('app.models')
  .factory('User', function($resource) {
    return $resource('/users/:id', { id: '@id' });
  });
```

Then the fixture file would look like:
```js

/**
 * This code can be abstracted in a service and reused for most models.  
 */ 
angular.module('demo', ['ngMockE2E', 'LocalDbStore'])
  .run(function($httpBackend, localDbStore) {
    // define the regular expressions for 
    // the collection url and for an item's url
    var USERS_URL = new RegExp('/users$');
    var USER_URL = new RegExp('/users/([0-9]+)$');

    // initialise the store by specifying the key
    // used by localStorage
    var store = localDbStore('users');

    // Create
    // POST /users
    $httpBackend.whenPOST(USERS_URL).respond(function(method, url, data, headers) {
      // this will add the new data to localStorage
      // and assign an `id` property
      var response = store.create(data);
      return [200, response];
    });

    // Update
    // PUT /user/:id
    $httpBackend.whenPUT(USER_URL).respond(function(method, url, data, headers) {
      // retrieve the user's id from the url
      // and update the store by replacing the old item 
      // which matches the specified id, with the new data
      var id = parseInt(url.match(USER_URL)[1], 10),
        success = store.update({id: id}, data);
      return [200, response];
    });

    // Delete
    // DELETE /users/:id
    $httpBackend.whenDELETE(USER_URL).respond(function(method, url, data, headers) {
      // retrieve the user's id from the url
      // remove the item that matches the id
      var id = parseInt(url.match(USER_URL)[1], 10),
        success = store.remove({id: id});
      return [200, success];
    });

    // Get One
    // GET /users/:id
    $httpBackend.whenGET(USER_URL).respond(function(method, url, data, headers) {
        // retrieve the user's id from the url
        // return the item from the collection which matches the id
        var id = parseInt(url.match(USER_URL)[1], 10),
          response = store.findOne({id: id});
      return [200, response];
    });

    // Get all
    // GET /users
    $httpBackend.whenGET(USERS_URL).respond(function(method, url, data, headers) {
      var response = store.findAll();
      return [200, response];
    });
  })
```

## Associations

Let's imagine that we have a `Comment` resource which is a nested resource for `User`.

```js
angular.module('app.models')
  .factory('Comment', function($resource) {
    return $resource('/users/:user_id/comments/:comment_id', { user_id: '@user_id', comment_id: '@id' });
  });
```

Now, after we initialise the `localDbStore`, we need to specify the association like this:

```js
var store = localDbStore('comments');
store.belongsTo([{'users': 'user_id'}]);
```
The key, in our case `users`, is a name of a different collection which is the parent resource and the value, in our case `user_id`, represents the "foreign key".

```js
$httpBackend.whenGET(USERS_URL).respond(function(method, url, data, headers) {
  var response = usersStore.findAll({});
  
  /**
   * A user object might look like: 
   * {id: 1, name: 'User 1'}
   **/ 
  return [200, response];
});
```
This will load all the users but not the comments. 

To include the comments for each user, you need to manually specify it like this:
```js
$httpBackend.whenGET(USERS_URL).respond(function(method, url, data, headers) {
  var response = usersStore.findAll({}, {include: ['comments']});
  
  /**
   * each user object will contain a `comments` property
   * which is an array of all the comments who's user_id matches 
   * the current user's id
   * 
   * A user object might now look like:
   * {id: 1, name: 'User 1', comments: [{id: 1, user_id: 1, text: 'This is a comment'}]}
   */
  
  return [200, response];
});
``` 

**NOTE**

You can include any collection when you do a `store.findAll` or `store.findOne`, not just the ones that have an association defined. This means that instead of having a nested collection of only items that have a set of matching ids, you will get the entire collection nested for each item.

```js
$httpBackend.whenGET(USERS_URL).respond(function(method, url, data, headers) {
  var response = usersStore.findAll({}, {include: ['groups']});
  
  /**
   * each user object will contain a `groups` property
   * which will contain all the groups, because there is no explicit association 
   * between users and groups
   * 
   * A user object might now look like:
   * {id: 1, name: 'User 1', groups: [{id: 1, name: 'Group1'}, {id: 2, name: 'Group 2'}]}
   */
  
  return [200, response];
});
``` 


### Tips
If you ever need to clear the collections you saved you can use the browser's console and type: 
```js
localStorage.clear();
```

If you want to only delete specific collections, use:
```js
delete localStorage.users
```

If you use Chrome, you could open the Developer Tools, click on the Resources tab, select Local Storage and manually edit/remove the collections.