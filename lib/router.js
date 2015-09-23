var subs = new SubsManager();

Router.map(function() {

  this.route('historicalPage', {
    path: '/historical',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else if (!Meteor.user()) {
        this.render('loginPage');
      } else {
        this.next();
      }
    }
  });

  this.route('employeeSettings', {
    path: '/employeeSettings',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else if (!Meteor.user() && !Meteor.user().admin) {
        this.render('SelectedTimesheet');
      } else {
        this.next();
      }
    }
  });

  this.route('adminPage', {
    path: '/admin',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else if (!Meteor.user() && !Meteor.user().admin) {
        this.render('SelectedTimesheet');
      } else {
        this.next();
      }
    }
  });

  this.route('activeProjects', {
    path: '/projects',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else if (!Meteor.user() && !Meteor.user().admin) {
        this.render('SelectedTimesheet');
      } else {
        this.next();
      }
    }
  });

  this.route('approvalPage', {
    path: '/approval',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else if (!Meteor.user() && !Meteor.user().manager) {
        this.render('SelectedTimesheet');
      } else {
        this.next();
      }
    }
  });

  this.route('loginPage', {
    path: '/',
    onBeforeAction: function(pause) {
      if (!Meteor.userId()) {
        this.render('loginPage');
      } else {
        this.next();
      }
    }
  });

  this.route('logout', {
    path: '/loggedout',
    onBeforeAction: function(pause) {
      Meteor.logout();
      Router.go("loginPage");
    }
  });

  this.route('SelectedTimesheet', {
    path: '/timeSheet',
    waitOn: function() {
      return [subs.subscribe('timesheet'),
              subs.subscribe('projects')
      ];
    },
    action: function() {
      if (this.ready()) {
        this.render();
      }
    },
    onBeforeAction: function(pause) {
      if (!Meteor.userId) {
        this.render('loginPage');
      } else if (!Meteor.user()) {
        this.render('SelectedTimesheet');
      } else {
        this.next();
      }
    }
  });
});
