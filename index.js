var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;

var app = express();

var jsonParser = bodyParser.json();

var User = require('./models/user');
var Message = require('./models/message');
var url = require('url');
var queryString = require('querystring');

var strategy = new BasicStrategy(function(username, password, callback) {
    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            callback(err);
            return;
        }

        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }

        user.validatePassword(password, function(err, isValid) {
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});

passport.use(strategy);
app.use(passport.initialize());
app.get('/hidden', passport.authenticate('basic', {session: false}), function(req, res) {

    res.json({
        message: 'Luke... I am your father'
    });
});

app.get('/users', function(req, res) {
    User.find(function(err, users) {
        if (err) {
            return res.status(500).json({
               message: 'Internal Server Error' 
            });
        }
        res.status(200).json(users);
    });
});

app.post('/users', jsonParser, function(req, res) {
    if (!req.body) {
        return res.status(400).json({
            message: "No request body"
        });
    }

    if (!('username' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }

    var username = req.body.username;

    if (typeof username !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }

    username = username.trim();

    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }

    if (!('password' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: password'
        });
    }

    var password = req.body.password;

    if (typeof password !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: password'
        });
    }

    password = password.trim();

    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }
        bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }

        bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }

            var user = new User({
                username: username,
                password: hash
            });

            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }

                return res.status(201).json({});
            });
        });
    });
    
});

// app.post('/users', jsonParser, function(req, res) {
//     User.create({
//         username: req.body.username
//     }, function(err, user) {
//          if (!req.body.username) {
//             return res.status(422).json({
//                 message: 'Missing field: username'
//             });
//         }
//         else if (typeof req.body.username != 'string') {
//             return res.status(422).json({
//               message: 'Incorrect field type: username' 
//             });
//         }
//         else if (err) {
//             return res.status(500).json({
//                 message: 'Internal Server Error'
//             });
//         }
//         res.location('/users/' + user._id);
//         res.status(201).json({});
//     });
// });

app.get('/users/:userId', function(req, res) {
    User.findOne({
        _id: req.params.userId
    },function(err, user) {
        if (err || !user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
       res.status(200).json(user); 
    });
});

app.put('/users/:userId', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
    User.findByIdAndUpdate(
        {_id: req.params.userId},
        { $set: {username: req.body.username}},
        { upsert: true, new: true, setDefaultsOnInsert: true }
    , function(err) {
        console.log(req.body);
         if (!req.body.username) {
            return res.status(422).json({
                message: 'Missing field: username'
            });
        }
        else if (typeof req.body.username != 'string') {
            return res.status(422).json({
               message: 'Incorrect field type: username' 
            });
        }
        else if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }
        res.status(200).json({});
    });
});

app.delete('/users/:userId', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
    User.findOneAndRemove(
        {_id: req.params.userId},
       function(err, user) {
           if(err || !user) {
               return res.status(404).json({
                   message: 'User not found'
               });
           }
           res.status(200).json({});
           console.log('Delete item');
       }
    );
});

app.get('/messages', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
// app.get('/messages', jsonParser, function(req, res) {
    // var query = {};
    // if (req.query.to != undefined) {
    //     query['to'] = req.query.to;
    // }
    // if (req.query.from != undefined) {
    //     query['from'] = req.query.from;
    // }
    // console.log(req.query.to, "REQUEST");
    //console.log(req.url, 'req.url' );
    var a_query = url.parse(req.url).query;
    var query = queryString.parse(a_query);
    Message.find(query)
    .where("from").equals(req.user._id)
        .populate('from')
        .populate('to')
        .exec(function(err, messages) {
        if (err) {
            return res.status(500).json({
               message: 'Internal Server Error' 
            });
        }
        console.log(res.body, "RESPONSE");
        // console.log(req, "REQ");
        res.status(200).json(messages);
    });
})

app.post('/messages', passport.authenticate('basic', {session: false}) ,jsonParser, function(req, res) {
    //console.log(req.body, "REQ BODY");
    if (!req.body.text) {
        return res.status(422).json({
            message: 'Missing field: text'
        });
    }
    else if (!req.body.from) {
        return res.status(422).json({
            message: 'Incorrect field type: from'
        })
    }
    
    else if (!req.body.to) {
        return res.status(422).json({
            message: 'Incorrect field type: to'
        })
    }
    
    else if (typeof req.body.text != 'string') {
        return res.status(422).json({
          message: 'Incorrect field type: text' 
        });
    }
    else if (typeof req.body.to != 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: to'
        })
    }
    else if (typeof req.body.from != 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: from'
        })
    }
    else if (!mongoose.Types.ObjectId.isValid(req.body.from)) {
        console.log("CHECKPOINT 1");
        return res.status(422).json({
            message: 'Incorrect field value: from'
        })
    }
    else if (!mongoose.Types.ObjectId.isValid(req.body.to)) {
        console.log("CHECKPOINT 2");
        return res.status(422).json({
            message: 'Incorrect field value: to'
        })
    }
    console.log(req, "REQQQQQQ");
    console.log(req.body);
    Message.create({to: req.body.to,
        from: req.user._id, // change from to user that is signed in
        text: req.body.text},
        function(err, messages) {
            // console.log(err, "ERROR");
            // console.log(messages, "MESSAGES")
            // console.log("MADE IT HERE!!!!!!!!!");
            if (err) {
                return res.status(422).json({
                    message: 'Internal Server Error'
                });
            }
            res.location('/messages/' + messages._id);
            res.status(201).json({});
        })
})

app.get('/messages/:messageId', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
        // console.log("CHECKPOINT 1");
        return res.status(404).json({
            message: 'Incorrect message ID'
        })
    }
    Message.findOne({_id: req.params.messageId})
        .populate('from to')
        // .populate('to')
        .exec(function(err, message) {
        if (err) {
            return res.status(500).json({
               message: 'Internal Server Error' 
            });
        }
        console.log(message, "RESPONSE");
        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            })
        }
        res.status(200).json(message);
    });
})
// Add your API endpoints here

var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;

