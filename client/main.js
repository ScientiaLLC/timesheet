ChargeNumbers = new Meteor.Collection('charge_numbers');
Employees = new Meteor.Collection('employees');
TimeSheet = new Meteor.Collection('time_sheets');
Jobs = new Meteor.Collection('jobs');

Deps.autorun(function () {
  Meteor.subscribe('userData');
  Meteor.subscribe('projects');
  Meteor.subscribe('timesheet');
  Meteor.subscribe('serverjobs');
});

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});

headers.ready(function () {
  var user = headers.get('x-forwarded-user');
  if (!user) {
    Session.setDefault('current_page', 'login_page');
  } else {
    Meteor.startup(function () {
      Meteor.call('getLdapManagerGroups', function (error, data) {
        if (!error) {
          Session.set('manager_groups', data);
        }
      });
      permitLdapEmployee(user);
    });

    Session.setDefault('current_page', 'time_sheet');
  }
});

Template.pages.events({
  'mousedown .tag': function (evt) {
    Session.set('editing-user-page', false);
    var selected = evt.currentTarget.id;
    if (selected === 'time_sheet') {
      var callback = function (error, data) {
        Session.set('current_page', 'selected_timesheet');
        var date = (data.start.getMonth() + 1) + '/' + data.start.getDate() + '/' + data.start.getFullYear();
        console.log(date);
        Session.set('startDate', date);

      };
      Meteor.call('getCurrentWeekObject', callback);

    } else {
      Session.set('current_page', evt.currentTarget.id);
    }

    Session.set('search_employee', null);
  }
});

Template.pages.helpers({
 getUsername: function () {
        var user = Meteor.users.findOne({_id: Session.get('LdapId')});
        if (!user){
            return 'Please login';
        }
        return user.username;
    },
    isLogin: function() {
        var id = Session.get('LdapId');
        return Session.get('LdapId');
    },
    isManager: function () {
        var id = Session.get('LdapId');
        if (!id){
            return;
        }
        var user = Meteor.users.findOne({_id: id});
        if (!user){
            return false;
        }
        return user.manager;
    },
    isAdmin: function () {
        var id = Session.get('LdapId');
        if (!id){
            return;
        }
        var user = Meteor.users.findOne({_id: id});
        if (!user){
            return false;
        }
        return user.admin;
    }

});


Template.loginPage.events({
  'click .btn': function (event) {
    /*
     Gets login information from the page and sends it to LDAP for validation.
     This is not secure and is temporary for testing, eventually need to switch to headers with Apache.
     */
    event.target.type = 'button';
    $('#LDAPusername').parent().removeClass('has-error');
    $('#LDAPpassword').parent().removeClass('has-error');
    $('#LDAPusername').tooltip('destroy');
    $('#LDAPpassword').tooltip('destroy');

    var username = $('#LDAPusername')[0].value;
    var password = $('#LDAPpassword')[0].value;

    Meteor.call('getLdapManagerGroups', function (error, data) {
      if (!error) {
        Session.set('manager_groups', data);
      }
    });
    authenticateLdapEmployee(username, password);

    Router.go('SelectedTimesheet');
  }
});

