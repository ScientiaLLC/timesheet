var subs = new SubsManager();

Router.map(function (){
  
	this.route('historicalPage', {
		path: '/historical'
    ,
      waitOn: function(){
        return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];

      }, action: function() {
      if (this.ready()) {
        this.render();
      }
    },
      onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          //console.log("Historical" + id);
          var user = Meteor.users.findOne({_id: id});
          if(!id){
            this.render('loginPage');
          }else if(!user){
            this.render('loginPage');
          }else{
            this.next();
        }
      }
	});

	this.route('employeeSettings', {
		path: '/employeeSettings'
    ,
     waitOn: function(){
         return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];

      }, action: function() {
      if (this.ready()) {
        this.render();
      }
    },
     onBeforeAction: function (pause) {
         var id = Session.get('LdapId');
          var user = Meteor.users.findOne({_id: id});
          if(!id){
            this.render('loginPage');
          }else if(!user.admin){
            this.render('SelectedTimesheet');
          }else{
            this.next();
        }
      }
	});
	
	this.route('adminPage', {
		path: '/admin'
     ,
      waitOn: function(){
         return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];

      }, action: function() {
      if (this.ready()) {
        this.render();
      }
    },
     onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          console.log(id);
          var user = Meteor.users.findOne({_id: id});
          console.log(user);
          if(!id){
            this.render('loginPage');
          }else if(!user.admin){
            this.render('SelectedTimesheet');
          }else{
            this.next();
        }
      }
	});

	this.route('activeProjects', {
		path: '/projects'
     ,
     waitOn: function(){
        return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];

      },
     onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          var user = Meteor.users.findOne({_id: id});
          if(!id){
            this.render('loginPage');
          }else if(!user.admin){
            this.render('SelectedTimesheet');
          }else{
            this.next();
        }
      }, 
      action: function() {
      if (this.ready()) {
        this.render();
      }
    }   
	});

	this.route('approvalPage' ,{
		path: '/approval'
     ,
      waitOn: function(){
        return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];

      }, action: function() {
      if (this.ready()) {
        this.render();
      }
    },
     onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          var user = Meteor.users.findOne({_id: id});
          if(!id){
            this.render('loginPage');
          }else if(!user.manager){
            this.render('SelectedTimesheet');
          }else{
            this.next();
        }
      }
	});
	
	this.route('loginPage',{
		path: '/'
     ,
     onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          if(!id){
            this.render('loginPage');
          }else{
          console.log(id);
          this.next();
        }
      }
	});

  this.route('logout',{
    path: '/loggedout'
     ,
     onBeforeAction: function (pause) {
        Session.set("LdapId", "");
        Router.go("loginPage");      
    }
  });


	this.route('SelectedTimesheet', {
		path:'/timeSheet'
    ,
      waitOn: function(){
        return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
        ];
      },
     onBeforeAction: function (pause) {
          var id = Session.get('LdapId');
          //console.log("timeSheet" + id);
          var user = Meteor.users.findOne({_id: id});
          if(!id){
            this.render('loginPage');
          }else if(!user){
            this.render('loginPage');
          }else{
            this.next();
        }
      },
       action: function() {
      if (this.ready()) {
        this.render();
      }
    }
      
	});

});
