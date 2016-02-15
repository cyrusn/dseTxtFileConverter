'use strict';

const fs = require('fs');
const _ = require('lodash');
const json2csv = require('json2csv');
const Code = require('./code.json');
const Filenames = fs.readdirSync('./raw');
const Path = require('path');

function convertCodeToText (array) {
  return array.map(string => {
    const obj = _.find(Code, {'code': string});
    return obj ? obj.abbr : string;
  });
}

function parseTxt2JSON (lines) {
  return lines.map(line => {
    const basicInfoRegExp = /^(\d)+\s+(\w\d{6}\w)\s+(\d{4})(\d{2})(\d{2})WEBSAMS\s+DSE\s+(\d{4})([\w\s]+)30794+(\d+)\s+(.*)$/;
    const schema = {
      'id': '$2',
      'dob': '$3-$4-$5',
      'name': '$7',
      'hkeaaId': '$8',
      'grades': '$9'
    };

    const jsonString = JSON.parse(
      // construct literal object with regex parsing
      // the grades are saved as result and parsed separately
      line
        // convert 5** to 7
        .replace(/5\*\*/g, '7')
        // convert 5* to 6
        .replace(/5\*/g, '6')
        .replace(basicInfoRegExp, JSON.stringify(schema))
    );

    // split string into array of words
    jsonString.name = _.words(jsonString.name).join(' ');

    const APLRegExp = /([B]\d{3})\s+(\w{2})\s+([YN])/g;
    // handle subgrade of A010
    const A010RegExp = /(A010)\s+1\s+([\dUX])\s+2\s+([\dUX])\s+3\s+([\dUX])\s+4\s+([\dUX])\s+5\s+([\dUX])/g;
    // handle subgrade of A020
    const A020RegExp = /(A020)\s+1\s+([\dUX])\s+2\s+([\dUX])\s+3\s+([\dUX])\s+4\s+([\dUX])/g;
    const generalSubjectRegExp = /([ABC]\d{3})\s+([\dUX])/g;
    // https://regex101.com/r/lZ8lO0/1
    // to solve the case for ... A165    A161   5     A162    4  ...
    // remove redundant A165 before A161 or A162
    const A165RegExp = /A165\s+([ABC])/g;

    // parse grades
    const resultString = '{' + jsonString.grades
        .replace(APLRegExp, '"APL":"$1-$2-$3",')
        .replace(A165RegExp, '$1')
        // convert to e.g. CHI-S:23223
        .replace(A010RegExp, '"$1S":"$2$3$4$5$6",')
        // convert to e.g. ENG-S:2322
        .replace(A020RegExp, '"$1S":"$2$3$4$5",')
        // convert to e.g. PHY:2
        .replace(generalSubjectRegExp, '"$1":"$2",')
        // remove all spaces
        .replace(/\s+/g, '')
        // remove the last comma
        .slice(0, -1) + '}';

    const resultObj = _(jsonString)
      // remove grades
      .omit('grades')
      .merge(JSON.parse(resultString))
      .value();

    return resultObj;
  });
}

function convertFile (file, filename) {
  // body...
  // https://lodash.com/docs#compact
  const dataArray = _.compact(file.split('\r\n'));
  const convertedData = parseTxt2JSON(dataArray);
  const filePath = Path.join('./result', Path.basename(filename, '.txt'));
  console.log(filePath);

  fs.writeFileSync(filePath + '.json', JSON.stringify(convertedData), 'utf-8');

  const fields = ['id', 'dob', 'name', 'hkeaaId', 'A010', 'A020', 'A030', 'A031', 'A032', 'A040', 'A070', 'A080', 'A100', 'A110', 'A120', 'A130', 'A140', 'A150', 'A161', 'A162', 'A163', 'A165', 'A172', 'A200', 'A230', 'A010S', 'A020S', 'APL'];
  const fieldNames = convertCodeToText(fields);

  const config = {
    data: convertedData,
    fields: fields,
    fieldNames: fieldNames
  };

  json2csv(config, (err, csv) => {
    if (err) throw err;
    fs.writeFileSync(filePath + '.csv', csv, 'utf-8');
    console.log('Process Complete!');
  });
}

Filenames.forEach(filename => {
  const filePath = Path.join('./raw', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  console.log(`Converting ${filename}:`);
  convertFile(data, filename);
});
