/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    SLACK_TOKEN=<MY TOKEN> node slack_bot.js

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

require('dotenv').config();

if (!process.env.SLACK_BOT_WEBHOOK) {
    console.log('Error: Specify slack token in .env file');
    process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');
var prettyjson = require('prettyjson');
var pg = require('pg');

var options = {};
if (process.env.DEBUG === 'true') {
    options.debug = true;
}
var controller = Botkit.slackbot(options);

var bot = controller.spawn({
    token: process.env.SLACK_BOT_WEBHOOK
}).startRTM();

var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/nfldb';
var client = new pg.Client(connectionString);
client.connect(function (err) {
    if (err) throw err;
    client.query('select * from player limit 1', function (err, result) {
        if (err) throw err;
        //console.log(prettyjson.render(result));
        client.end(function (err) {
            if (err) throw err;
        });
    });
});

function playerStats(name, year) {

}

//Run a simple web server for slack commands
controller.setupWebserver(process.env.SERVER_PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);
});

controller.on('slash_command', function (bot, message) {
    console.log(message);
    switch (message.command) {
        case '/nflbot':
            nflCommand(bot, message);
            break;
        default:
            bot.replyPrivate(message, 'Your command is not allowed');
    }
});

function nflCommand(bot, message) {
    if (message.token == process.env.SLACK_CMD_NFLBOT) {
        var found = message.text.match(/(.*) (schedule|stats)( ([\d]*))?/i);
        if (found) {
            var name = found[1];
            var type = found[2];
            var year = found[4];
        }
        // bgg('/search', {query: message.text, type: 'boardgame'}, function (res) {
        //     var results = res.items.item;
        //
        //     if (results.length == 0) {
        //         bot.replyPrivate(message, 'No results found for “'+message.text+'”.');
        //     }
        //     var matches = results.filter(function (elem) {
        //         return elem.name.value.toUpperCase() == message.text.toUpperCase();
        //     });
        //     if (matches.length == 0) {
        //         matches = results;
        //     }
        //
        //     var year = -99999;
        //     var match = null;
        //     matches.forEach(function (elem) {
        //         if (elem.yearpublished.value > year) {
        //             match = elem;
        //             year = elem.yearpublished.value;
        //         }
        //     });
        //     replyGame(bot, message, match.id);
        // });
    }
}

// function bgg(path, options, callback) {
//     var api = 'https://www.boardgamegeek.com/xmlapi2';
//     request({
//         url: api + path,
//         qs: options
//     }, function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//             callback(xml2json.toJson(body, {object: true}));
//         }
//     });
// }

function replyGame(bot, message, gameId) {
    var options = {
        id: gameId,
        stats: 1
    };
    bgg('/thing', options, function (res) {
        var info = res.items.item;
        // var year = info.release_date.substring(0, 4);
        // var thumb = configuration.images.base_url
        //     + configuration.images.poster_sizes[0]
        //     + info.poster_path;
        // var release = moment(info.release_date).format('dddd, MMMM Do YYYY');
        bot.replyPublicDelayed(message, {
            text: 'This is what I found for “' + message.text + '”',
            attachments: [
                {
                    title: info.name[0].value + ' (' + info.yearpublished.value + ')',
                    title_link: 'https://boardgamegeek.com/boardgame/'+info.id,
                    thumb_url: info.thumbnail.replace('//', 'https://'),
                    text: info.description,
                    fields: [
                        {
                            title: 'Rating',
                            value: info.statistics.ratings.ranks.rank[0].bayesaverage,
                            short: true
                        },
                        {
                            title: 'Playing Time',
                            value: (info.playingtime.value) + ' minutes',
                            short: true
                        },
                        {
                            title: 'Core Mechanics',
                            value: info.link.filter(function (cur) {
                                return cur.type == 'boardgamemechanic';
                            }).map(function (cur) {
                                return cur.value;
                            }).join(', '),
                            short: true
                        }
                    ]
                }
            ]
        });
    });
}
