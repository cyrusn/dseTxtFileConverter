/* jshint node: true */
'use strict';

var fs = require('fs');
var _ = require('lodash');
var json2csv = require("json2csv");
var code = require('./code.json');
var data = fs.readFileSync('hkdse.txt', 'utf-8');

function convertCodeToText(array){
  return array.map(function(string){
    var obj = _.find(code, {'code': string});
    if (!obj) return string;
    return _.result(obj, "short");
  });
}

function parseTxt2JSON(data) {

  var newValue = _.map(data, function(line){

    var basicInfoRegExp = /(\d)+\s+(\w\d{6}\w)\s+(\d{4})(\d{2})(\d{2})WEBSAMS\s+DSE\s+(\d{4})([\w\s]+)30794+(\d+)\s+(.*)$/;
    var subsitition = {
      "id": "$2",
      "dob": "$3-$4-$5",
      "name": "$7",
      "hkeaaId": "$8",
      "grades": "$9"
    };

    var obj = JSON.parse(
      // construct literal object with regex parsing
      // the grades are saved as result and parsed separately
      line
        .replace(/5\*\*/g,"7")
        .replace(/5\*/g, "6")
        .replace(basicInfoRegExp, JSON.stringify(subsitition))
    );

    obj.name = _.words(obj.name).join(" ");

    var APLRegExp = /([B]\d{3})\s+(\w{2})\s+([YN])/g;
    var A010RegExp = /(A010)\s+1\s+([\dUX])\s+2\s+([\dUX])\s+3\s+([\dUX])\s+4\s+([\dUX])\s+5\s+([\dUX])/g;
    var A020RegExp = /(A020)\s+1\s+([\dUX])\s+2\s+([\dUX])\s+3\s+([\dUX])\s+4\s+([\dUX])/g;
    var generalSubjectRegExp = /([ABC]\d{3})\s+([\dUX])/g;
    // https://regex101.com/r/lZ8lO0/1
    // to solve the case for ... A165    A161   5     A162    4  ...
    var A165RegExp = /A165\s+([ABC])/g;

    var resultString = "{" + obj.grades
              .replace(APLRegExp, '"APL":"$1-$2-$3",')
              .replace(A165RegExp,"$1")
              .replace(A010RegExp, '"$1S":"$2$3$4$5$6",')
              .replace(A020RegExp, '"$1S":"$2$3$4$5",')
              .replace(generalSubjectRegExp,'"$1":"$2",')
              // remove all spaces
              .replace(/\s+/g,"")
              // remove the last comma
              .slice(0,-1) + "}";

    var resultObj =  _(obj)
                    .omit("grades")
                    .merge(JSON.parse(resultString))
                    .value();

    return resultObj;
  });
  return newValue;
}

// https://lodash.com/docs#compact
var dataArray = _.compact(data.split('\r\n'));
var convertedData = parseTxt2JSON(dataArray);

fs.writeFileSync('result.json', JSON.stringify(convertedData, null, 2), 'utf-8');

var fields = ["id","dob","name","hkeaaId","A010","A020","A030","A031","A032","A040","A070","A080","A100","A110","A120","A130","A140","A150","A161","A162","A163","A165","A172","A200","A230", "A010S", "A020S", "APL"];
var fieldNames = convertCodeToText(fields);
// console.log(fieldNames);

var config = {
    data: convertedData,
    fields: fields,
    fieldNames: fieldNames
};

json2csv(config, function(err, csv) {
  if (err) throw err;
  fs.writeFileSync('result.csv', csv, 'utf-8');
  console.log('Process Complete!');
});
