logger.debug('loading client/main.js');

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});

var ldapLoginError = function(error) {
  Session.set('loggingIn', false);
  if (error) {
    logger.error('client/main.js: loginWithLdapCallback: login error = ' + error.reason);
  }
  // if no user resulted from attempt, an error will be set
  $('#LDAPusername').parent().addClass('has-error');
  $('#LDAPusername').tooltip({
    title: 'Incorrect username or password',
    trigger: 'hover',
    animation: false
  });
  $('#LDAPpassword').parent().addClass('has-error');
  $('#LDAPpassword').tooltip({
    title: 'Incorrect username or password',
    trigger: 'hover',
    animation: false
  });
};

Meteor.loginWithLdap = function(username, password) {
  var forwardedUser = headers.get('x-forwarded-user');
  if (!forwardedUser && !password) {
    logger.error('client/main.js: loginWithLdap: password cannot be blank');
    ldapLoginError();
    return;
  }
  var loginRequest = {username: username, password: password, forwardedUser: forwardedUser};

  Accounts.callLoginMethod({
    methodArguments: [loginRequest],
    userCallback: function loginCallback(error) {
      if (error) {
        Meteor.logout();
        ldapLoginError(error);
      } else {
        if (Meteor.user()) {
          console.log('Meteor.user() = ' + JSON.stringify(Meteor.user(), null, 4));

          var callback = function (error, data) {
            if (!error) {
              Session.set('current_page', 'selected_timesheet');
              var date = (data.start.getMonth() + 1) + '/' + data.start.getDate() +
                  '/' + data.start.getFullYear();
              Session.set('startDate', date);
            } else {
              Session.set('current_page', 'time_sheet');
            }
          };
          Meteor.call('getCurrentWeekObject', callback);

          Router.go('SelectedTimesheet');
        } else {
          ldapLoginError();
        }
      }
    }
  });
};


headers.ready(function () {
  var user = headers.get('x-forwarded-user');
  logger.debug('client/main.js: x-forwarded-user = ' + user);
  if (!user) {
    Session.setDefault('current_page', 'login_page');
  } else {
    Meteor.loginWithLdap(user, undefined);

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
        logger.debug('start date = ' + date);
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
        var user = Meteor.user();
        if (!user){
            return 'Please login';
        }
        return user.username;
    },
    isLogin: function() {
        return Meteor.userId();
    },
    isManager: function () {
        var user = Meteor.user();
        if (!user){
            return false;
        }
        return user.manager;
    },

  isAdmin: function () {
    var user = Meteor.user();
    if (!user) {
      return false;
    }
    return user.admin;
  },

  displayLoginDropdown: function () {
    headers.ready(function () {
      var user = headers.get('x-forwarded-user');
      if (user) {
        return false;
      } else {
        return true;
      }
    });
  }
});


Template.loginPage.events({
  'click .btn': function (event) {
    // Gets login information from the page and sends it to LDAP for validation.
    event.target.type = 'button';
    $('#LDAPusername').parent().removeClass('has-error');
    $('#LDAPpassword').parent().removeClass('has-error');
    $('#LDAPusername').tooltip('destroy');
    $('#LDAPpassword').tooltip('destroy');

    var username = $('#LDAPusername')[0].value;
    var password = $('#LDAPpassword')[0].value;

    Meteor.loginWithLdap(username, password);
  }
});
