/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var app = app || {};

app.User = Backbone.Model.extend({
    defaults: {
        login: '',
        password: ''
    }
});

