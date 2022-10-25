var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
const jsSHA = require("jssha");
const stemmer = require("stemmer")

//NOTES
// retrieve all articles for each word
// freq datastructure
// key is article, value is list of keywords
// before sorting, find num of matching keywords
// article => freq of keywords
// sort map by values (write compare function, compare by value)
// iterate key value pair to array
// array.sort with custom comparator

// set timeout (function, time interval)
// function - livy
// command = 'cd ../spark && mvn exec:java@livy';
//   exec(command, (err, stdout, stderr) => {

// var search_article = function(keyword, callback) {
//     console.log('Searching for article with keyword: ' + keyword); 
//     var params = {
//       TableName: "news_articles_search",
//       KeyConditionExpression: "keyword = :k",
//       ExpressionAttributeValues: {
//           ":k": {"S" : keyword}
//       }
//     };
  
//     db.query(params, function(err, data) {
//       if (err || data.Items.length == 0) {
//         callback(err, null);
//       } else {
//         callback(err, data.Items);
//       }
//     });
//   }

function like_article(username, articleId) {
	
	var params = {
		TableName: "user_article_likes",
		Item: {
			"pk" : { "S" : username },
			"sk" : { "S" : articleId }
		}
	}
	
	var params2 = {
		TableName: "user_article_likes",
		Item: {
			"pk" : { "S" : articleId },
			"sk" : { "S" : username }
		}
	}
	
	db.putItem(params, function(err) {
        if (err) {
			console.log(err)
    	} else {
			db.putItem(params2, function(err2) {
				if (err2) {
					console.log(err2)
				}
			});
    	}
    });
}

const stopWordsList = ["a", "all", "any", "but", "the"];

function clean(token, stopWordsList) {
	//clean word, only alphabetical chars allowed
	token = token.trim();
	if (token.match("[a-zA-Z]+")) {
		var lCaseToken = token.toLowerCase();
		if (!(stopWordsList.includes(lCaseToken))) {
			lCaseTokenStemmed = stemmer(lCaseToken);
			return lCaseTokenStemmed;
		}
	} else {
		return null;
	}
}

var search_article = function(keyword, callback) {
  console.log('Searching for article with keyword: ' + keyword);
  //preprocessing
	var words = keyword.split(/[ ]+/);
	words = words.map(word => clean(word, stopWordsList)).filter(x => x);
  console.log(words);
  var promises = [];
  words.forEach(word => {
    var params = {
      TableName: "news_articles_search",
      KeyConditionExpression: "pk = :word",
      ExpressionAttributeValues: {
        ":word": {"S" : "w#" + word}
      }
    };
    promises.push(db.query(params).promise());
  })
  //promises: list of articles by word
  Promise.all(promises).then(function(promises) {
    if (promises.Count == 0) {
      callback(null, null);
    } else {
      promisesHitCount = [];
      promises.forEach(promise => {
        console.log(promise);
        promise.Items.forEach(article => {
          console.log(article.pk);
          console.log(article.sk);
          var expressionAttributeValues = {":article" : article.sk};
          var filterExpressionWords = "";
          for (var i = 0; i < words.length; i++) {
            expressionAttributeValues[":word"+i] = { 'S': "w#" + words[i]}
            if (i == 0) {
              filterExpressionWords += ":word" +i;
            } else {
              filterExpressionWords += ", :word" +i;
            }
          }
          console.log("Expression Attribute Values")
          console.log(expressionAttributeValues)
          var params2 = {
            TableName: "news_articles_search",
            //should use IN (all keywords)
            KeyConditionExpression: "pk = :article",
            FilterExpression: "word IN (" + filterExpressionWords + ")",
            ExpressionAttributeValues: expressionAttributeValues,
          };
          promisesHitCount.push(db.query(params2).promise());
        });
      });
      Promise.all(promisesHitCount).then(function(promisesHitCount) {
        var articleMap = new Map();
        promisesHitCount.forEach(promise => {
          articleMap.set(promise.Items[0].pk.S, Object.assign(promise.Items[0], {'count': promise.Count}))
        })
        callback(null, articleMap)
      })
    }
  });
		//when all promises return, display results
		// Promise.all(promises).then(function(promises) {
		// 	var talks = [];
		// 	promises.forEach(promise => {
		// 		promise.Items.forEach(talk => {
		// 			talks.push(serialize(talk));
		// 		});
		// 	});
		// 	response.render("results", { "query": request.query.id, "talks": talks });
		// });
}

var get_article_recommendation = function(id, callback) {
  console.log("getting article recommendation");
  console.log(id);
  var params = {
    TableName: "news_articles_search",
    KeyConditionExpression: "pk = :article",
    ExpressionAttributeValues: {
      ":article": {"S" : id},
    },
    Limit: 1
  };
  db.query(params, function (err, data) {
    if (err) {
      console.log(err)
      callback(err, null);
    } else if (data.Items.length == 0) {
      console.log("No more articles to recommend");
      callback(err, null);
    } else {
      callback(err,  data.Items[0]);
    }
    
  })
}

var get_article_recommendations = function(user, callback) {
  var params = {
    TableName: "news_articles_suggestions",
    KeyConditionExpression: "username = :u",
    FilterExpression: "recommended = :r",
    ExpressionAttributeValues: {
        ":u": {"S" : user},
        ":r": {"BOOL": true}
    }
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else if (data.Items.length == 0) {
      callback(err, []);
    } else {
      var promises = [];
      data.Items.forEach((item) => {
        var params = {
          TableName: "news_articles_search",
          KeyConditionExpression: "pk = :article",
          ExpressionAttributeValues: {
            ":article": item.article,
          },
          Limit: 1
        };
        promises.push(db.query(params).promise());
      });

      Promise.all(promises).then(function(promises) {
        console.log("PROMISES");
        console.log(promises);
        if (promises.Count == 0) {
          callback(null, null);
        } else {
          callback(null, promises.map(promise => promise.Items[0]));
        }
      });
    }
  });
}

var post_new_article_recommendation = function(user, callback) {
  var params = {
    TableName: "news_articles_suggestions",
    KeyConditionExpression: "username = :u",
    FilterExpression: "recommended = :r",
    ExpressionAttributeValues: {
        ":u": {"S" : user},
        ":r": {"BOOL": false}
    }
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, "Error");
    } else if (data.Items.length == 0) {
      callback(err, "No new articles");
    } else {
      sum = 0
      data.Items.forEach((item) => sum += parseFloat(item.weight.N));
      num = Math.random() * sum;
      cumSum = 0;
      for (var i = 0; i < data.Items.length; i++) {
        cumSum += parseFloat(data.Items[i].weight.N)
        if (cumSum >= num) {
          randomId = data.Items[i].article.S
          var paramsUpdate = {
            TableName: "news_articles_suggestions",
            Key: {
              "username": {"S" : user},
              "article": {"S" : randomId}
            },
            UpdateExpression: "set recommended = :b",
            ExpressionAttributeValues: {
              ":b": {"BOOL": true}
            },
            ReturnValues:"UPDATED_NEW"
          }
          db.updateItem(paramsUpdate, function(err) {
            if (err) {
              callback(err, "error updating");
            } else {
              callback(err, randomId);
            }
          })
          break;
        }
      }
      
      //sum 
      //sort by weights start with lowest
      //iterate, running sum of weights
      //whenever total sum is greater than total, return

    }
  });
}

var database_news = { 
    searchArticle: search_article,
    getArticleRecommendations: get_article_recommendations,
    postNewArticleRecommendation: post_new_article_recommendation,
    getArticleRecommendation: get_article_recommendation,
    likeArticle: like_article
  };
  
module.exports = database_news;