/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
// TicketView
// TicketDetailsView
var app = app || {};

app.TicketsView = Backbone.View.extend({
    
    tagName: 'div',
    
    className: 'tickets-view',
    
    initialize: function(){
        // render() has to be called before subscribing to add/remove event
        // otherwise ticket may get removed before it appears in the collection
        this.views = [];
        this.render();
        this.listenTo(this.collection, 'add', this.renderTicket);
        this.listenTo(this.collection, 'remove', this.removeTicket);
    },
    
    // Render all tickets
    render: function(){
        this.collection.each(function(item){
            this.renderTicket(item);
        }, this);
        return this;
    },
    
    // Add a ticket to the queue
    // TODO: Shouldn't just append to the list
    // Render one ticket
    renderTicket: function(item){
        var ticketView = new app.TicketView({model: item});
        this.listenTo(ticketView, "selected", this.ticketSelected);
        this.listenTo(ticketView, "unselected", this.ticketUnselected);
        this.$el.append(ticketView.render().el);
        this.views.push(ticketView);
    },
    
    ticketSelected: function(ticketView){
        if (!this.selectedView)
        {
            this.selectedView = ticketView;
            this.trigger("selectionChanged", this.selectedView);
            return;
        }
        
        // If an item has been selected, unselect the existing one
        // then select the new one
        if (ticketView.model.id !== this.selectedView.model.id)
        {
            this.selectedView.unselect();
            this.selectedView = ticketView;
            this.trigger("selectionChanged", this.selectedView);
        }
    },
    
    ticketUnselected: function(ticketView){
      if (ticketView === this.selectedView)
      {          
          this.selectedView = null;
          this.trigger("selectionChanged", null);
      }
    },
    
    // Remove a ticket from the collection
    removeTicket: function(item){
        
        // Not using any helper library like Underscore here,
        // because we want to get the index of the item and apply "splice" there
        var count = this.views.length;
        var view = null;
        for (var i = 0; i < count; i++)
        {
          if (item.id === this.views[i].model.id)
          {
              view = this.views[i];
              this.views.splice(i, 1);
              break;
          }
        }

        if (view)
        {
            this.ticketUnselected(view);
            view.close();
        }
    },
    
    refresh: function(){
        this.$el.empty();
        _.each(this.views, function(view){
           view.close(); 
        });
        this.views = [];
        this.render();
    },
   
    next: function(){
        // If second ticket exist, set the second ticket's status to Consulting
        // Remove the first one
        if (this.collection.length >= 2)
        {
            var item = this.collection.at(1);
            item.set("status", "Consulting");
            item.set("remainingWaitingTime", "Now");
        }
        this.collection.shift();
    }
});

app.TicketView = Backbone.View.extend({
    
    tagName: 'div',
    
    className: 'ticket-view',
    
    selectedClass: 'ticket-view-selected',
    
    template: _.template($('#ticket-template').html()),
    
    events: {
        'click': 'clicked'
    },
    
    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
    },
    
    clicked: function() {
        this.select();
    },
    
    render: function(){        
        data = _.clone(this.model.attributes);
        data["cid"] = this.model.cid;
        data["id"] = this.model.id;
        if (data["status"] === "Consulting")
        {
            data["statusClass"] = "in-progress";
        }
        else if (data["status"] === "Arrived")
        {
            data["statusClass"] = "arrived";
        }
        else
        {
            data["statusClass"] = "other";
        }
        
        data["targetTimeAsStr"] = moment(this.model.get("targetTime")).format("HH:mm");
        this.$el.html(this.template(data));
        return this;
    },

    select: function(){
        this.$el.addClass(this.selectedClass);
        this.trigger("selected", this);
    },
    
    unselect: function(){
        this.$el.removeClass(this.selectedClass);
        this.trigger("unselected", this);
    }
});

app.TicketDetailsView = Backbone.View.extend({

    tagName: 'div',

    events: {
        'click #save': 'enqueue',
        'click #delete': 'dequeue',
        'click #saveModify': 'modify'
    },

    initialize: function(){
    },
    
    render: function(){
        // if model == null, add; else, modify
        var templateParams = {};
        if (this.model)
        {
            templateParams = _.clone(this.model.attributes);
            templateParams["newEntryDisplayFlag"] = "none";
            templateParams["modifyEntryDisplayFlag"] = "block";
        }
        else
        {
            templateParams["displayName"] = "";
            templateParams["phone"] = "";
            templateParams["newEntryDisplayFlag"] = "block";
            templateParams["modifyEntryDisplayFlag"] = "none";
        }
        
        this.$el.html(_.template($('#ticket-details-template').html(), templateParams));
        return this;
    },

    complete: function(){
        this.trigger('completed');
    },
    
    modify: function(){
        this.model.set("displayName", this.$("#displayName").val());
        this.model.set("phone", this.$("#phone").val());
        this.complete();
    },
    
    enqueue: function(){
        var data = {};
        
        //http://stackoverflow.com/questions/11800890/apply-jquery-function-on-an-el-of-backbone-js-to-get-the-value-of-its-children
        this.$('input').each(function(i, el){
           if ($(el).val() !== '')
           {
               data[el.id] = $(el).val();
           }
        });
                
        // Number of tickets in the queue + buffer time
        var tickets = this.collection;

        var estimatedWaitingTime = 4 + Math.ceil(Math.random() * 2);
        var remainingWaitingTime = 0;
        if (tickets.length >= 1)
        {
            var lastTicket = tickets.at(tickets.length - 1);
            estimatedWaitingTime = moment(lastTicket.get("targetTime")).clone().add("m", estimatedWaitingTime);
            remainingWaitingTime = Math.ceil(estimatedWaitingTime.diff(Date.now())/60000);
        }
        data["targetTime"] = estimatedWaitingTime;
        data["remainingWaitingTime"] = remainingWaitingTime;
        
        this.collection.add(new app.Ticket(data));
        this.complete();
    },
    
    dequeue: function(){
        this.collection.remove(this.model);
        this.complete();
    }
});