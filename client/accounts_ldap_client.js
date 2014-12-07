// borrowed from https://raw.githubusercontent.com/gui81/muster/master/client/lib/accounts_ldap_client.js

// this password should be encrypted somehow when sent to the server
authenticateLdapEmployee = function(username, password) {
    Meteor.call('authenticateLdapEmployee', username, password, function(err, user){
        if(err){
            console.log("authentification error");
            // needs another way to alert this error
            alert("LDAP error contact your system admin");
            Session.set('loggingIn', false);
        } else {
            if(user){
                var id = null;
                var dbUser = Meteor.users.findOne({username:username})
                if(dbUser){
                    id = dbUser._id;
                    // needs to update only ldap fields in case of change
                    //alert(id);
                } else {
                    alert("new user");
                    id = Meteor.users.insert({
                        username: username,
                        cn: user.cn,
                        manager: false,
                        admin: false,
                        projects: [],
                        fulltime: true
                    });
		    
                }
           	// needs to set current user id
	        Session.set('LdapId',id);
		Session.set('current_page', 'time_sheet');
            } else{
		$('#LDAPusername').parent().addClass('has-error');
            	$('#LDAPusername').tooltip({
                    title: "Incorrect username or password",
                    trigger: 'hover',
                    animation: false
                });
            	$('#LDAPpassword').parent().addClass('has-error');
           	 $('#LDAPpassword').tooltip({
                    title: "Incorrect username or password",
                    trigger: 'hover',
                    animation: false
                });
	    }

        }
    });
};

