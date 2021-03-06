Template.associatedProjects.helpers({
  addingTag: function () {
    'use strict';
    return Session.equals('editing_addtag', this._id);
  },
  doneClass: function () {
    'use strict';
    return this.done ? 'done' : '';
  },
  getName: function (id) {
    'use strict';
    var proj = ChargeNumbers.findOne({'_id': id});

    return proj.name;
  },
  addCategory: function(projectId){
    var project = ChargeNumbers.findOne({'_id': projectId});
    var toReturn = [];
    if (project.categories) {
      var splitByComma = project.categories.split(",");
      splitByComma.forEach(function (cat){
        toReturn.push({category: cat});
      });
    }
    return toReturn;
  }
});

Template.employees_Template.events({
  'click .full': function () {
    'use strict';
    Meteor.call('setEmployeeFullTime', this._id, true);
  },
  'click .part': function () {
    Meteor.call('setEmployeeFullTime', this._id, false);
  }
});

Template.associatedProjects.events({
  'click .addtag': function (evt, tmpl) {
    'use strict';
    //alert(this.username + " ");
    // Session.set('editing_addtag', this._id);
    // Deps.flush(); // update DOM before focus
    // activateInput(tmpl.find("#edittag-input"));
    var id = $('#edittag-input').find(":selected").attr('value');
    var userId = this._id

    Meteor.call('addEmployeeToProject', userId, id);
    TimeSheet.find({'userId': userId, 'active': 1}).forEach(function (e) {
      var approve = {
        projectId: id,
        approved: false,
        sentBack: false
      };

      Meteor.call('addProjectToApprovalArray', e._id, approve);

    });
    Session.set('editing_addtag', null);


  },

  'dblclick .display .todo-text': function (evt, tmpl) {
    'use strict';
    Session.set('editing_itemname', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#todo-input"));
  },

  'click #removeUserFromProject': function (evt) {
    'use strict';
    //evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    var userId = evt.delegateTarget.firstElementChild.firstElementChild.id;
    Meteor.call('removeEmployeeFromProject', userId, String(this));
  },
  //adding the category to the projectEntry of the timesheet
  'blur #projectCategories': function(event){
    var userId = event.target.parentNode.parentNode.parentNode.id;
    var category = event.target.value;
    var projectName = event.target.parentNode.innerText.split(" ")[0];
    var projectId = ChargeNumbers.findOne({'name': projectName})._id;
    var toUpdate;
    var projectEntryArr = [];
    //used to get timesheet projectEntriesArray and find the correctTimesheet
    var sheet = TimeSheet.find({'userId': userId, 'active': 1});
    sheet.forEach(function (e) {
        if(e.projectEntriesArray.length != 0)
          projectEntryArr.push(e.projectEntriesArray);
        e.projectEntriesArray.forEach(function (pe){
          if(pe.projectId === projectId){
           toUpdate = e._id;
        }
      });
    });
    //creates a new projectEntry array to changed with the one Timesheet has
    var newProjectEntry = [];
    projectEntryArr.forEach(function(pe){
      pe.forEach(function(entry){
        if(entry.projectId === projectId){
          var project = {
            'projectId': projectId,
             'category': category,
             'EntryArray': entry.EntryArray
            }
            newProjectEntry.push(project);
      }else{
        newProjectEntry.push(entry);
      }
      });
    });
    //updating Timesheet
    TimeSheet.update({'_id': toUpdate},
      {
        $set: {
          'projectEntriesArray': newProjectEntry
        }
      });

      $('.toast').addClass('active');
      setTimeout(function () {
        $('.toast').removeClass('active');
        }, 5000);
  }
});

var okCancelEvents = function (selector, callbacks) {
  'use strict';
  var ok = callbacks.ok || function () {
            return;
          },
      cancel = callbacks.cancel || function () {
            return;
          },
      events = {};

  events['keyup ' + selector + ', keydown ' + selector + ', focusout ' + selector] =
      function (evt) {
        if (evt.type === "keydown" && evt.which === 27) {
          // escape = cancel
          cancel.call(this, evt);

        } else if ((evt.type === 'keyup' && evt.which === 13) ||
            evt.type === 'focusout') {
          // blur/return/enter = ok/submit if non-empty
          var value = String(evt.target.value || "");
          if (value) {
            ok.call(this, value, evt);
          } else {
            cancel.call(this, value, evt);
          }
        }
      };

  return events;
};

var activateInput = function (input) {
  'use strict';
  input.focus();
};

Template.associatedProjects.events(okCancelEvents(
    '#edittag-input',
    {
      ok: function (value) {
        Meteor.call('addEmployeeToProject', this._id, value);
        TimeSheet.find({'userId': this._id, 'active': 1}).forEach(function (e) {
          var approve = {
            projectId: value,
            approved: false,
            sentBack: false
          };

          Meteor.call('addProjectToApprovalArray', e._id, approve);

        });
        Session.set('editing_addtag', null);
      },
      cancel: function (value) {
        Session.set('editing_addtag', null);
      }
    }
));

Template.employeeSettings.helpers({
  addHolidayProjects: function () {
    'use strict';
    var employees = Meteor.users.find({});
    var holiday = ChargeNumbers.findOne({'is_holiday': true});
    if (!holiday) {
      return;
    }
    employees.forEach(function (e) {
      if (e.fulltime && e.projects.indexOf(holiday._id) == -1) {
        Meteor.call('addEmployeeToProject', e._id, holiday._id);

        var approve = {
          projectId: holiday._id,
          approved: false,
          sentBack: false
        };

        Meteor.call('addProjectToApprovalArray', e._id, approve);
      }
    });
  },
  chargeNumbers: function () {
    'use strict';
    var toReturn = [];
    ChargeNumbers.find().forEach(function (cn) {
      if (cn.indirect) {
        var dateObj = new Date();
        toReturn.push({
          id: cn._id,
          text: 'Indirect   ( ' + cn.name + ' )',
          endDate: dateObj.getMonth() + '/' + dateObj.getDate() + '/' + dateObj.getFullYear() + 1
        });
      } else {
        toReturn.push({
          id: cn._id,
          text: cn.id + '   ( ' + cn.name + ' )',
          endDate: cn.endDate
        });
      }
    });
    return toReturn;
  },
  isActive: function (date) {
    'use strict';
    return ProjectService.isActive(date);
  },
});

Template.employeeSettings.events({
  'click #addAll': function (evt) {
    var ids = [];
    var users = Meteor.users.find().forEach(function (user) {
      var userId = user._id;
      ids.push(userId);
    });

    var tempId;
    var projId = $('#edittag-input').find(":selected").attr('value');
    for (tempId in ids) {
      Meteor.call('addEmployeeToProject', ids[tempId], projId);
      TimeSheet.find({
        'userId': ids[tempId],
        'active': 1
      }).forEach(function (e) {
        var approve = {
          projectId: projId,
          approved: false,
          sentBack: false
        };

        Meteor.call('addProjectToApprovalArray', e._id, approve);

      });
    }
  },
  'click #removeAll': function (evt) {
    var ids = [];
    var users = Meteor.users.find().forEach(function (user) {
      var userId = user._id;
      ids.push(userId);
    });

    var tempId;
    var projId = $('#edittag-input').find(":selected").attr('value');
    for (tempId in ids) {

      Meteor.call('removeEmployeeFromProject', ids[tempId], projId);
      var value = projId;
      TimeSheet.find({
        'userId': ids[tempId],
        'active': 1
      }).forEach(function (e) {
        var approveArray = e.projectApprovalArray;
        var i = [];
        for (var a in approveArray) {
          // console.log(approveArray[a].projectId);
          if (approveArray[a].projectId != value) {
            i.push(approveArray[a]);
          }
        }

        Meteor.call('removeProjectFromApprovalArray', e._id, i);
      });
    }
  }
});
