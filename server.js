//Inline SAML Hook POST from Okta (endpoint: SAMLHook)
var express = require('express');
var app = express();
require('dotenv').config();
var bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const users = require('./users');

app.use(bodyParser.json());

app.get('/', function (request, response) {
  response.sendFile(__dirname + '/index.html');
});
app.post("/SAMLHook", (request, response) => {

  // Reject requests that don't present the shared secret configured on the Okta inline hook
  const authHeader = request.get(process.env.HOOK_AUTH_HEADER || 'Authorization');
  if (authHeader !== process.env.HOOK_AUTH_SECRET) {
    console.log("Rejected request: invalid or missing auth header.");
    return response.status(401).send();
  }

  console.log(" ");
  console.log("User email: " + request.body.data.context.user.profile["login"]);
  console.log("Name: " + request.body.data.context.user.profile["firstName"] + " " + request.body.data.context.user.profile["lastName"]);

  var patientName = request.body.data.context.user.profile["login"];

  if (users.some(user => user.username == patientName)){

    const arrayPosition = users.findIndex(user => user.username == patientName);
    const patientID = users[arrayPosition].ExternalServicePatientID;

    var returnValue = { "commands":[
                          { "type":"com.okta.assertion.patch",
                            "value": [
                                {
                                  "op": "add",
                                  "path": "/claims/extPatientId",
                                  "value": {
                                      "attributes": {
                                      "NameFormat": "urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified"    
                                        },
                                       "attributeValues":[
                                       {
                                       "attributes": {
                                         "xsi:type": "xs:integer"
                                       },
                                        "value": patientID,
                                       }
                                       ]
                                  }
                                }
                            ]
                          }
                      ]
                    }

  console.log("Added patient ID claim to SAML assertion: " + returnValue.commands[0].value[0].value.attributeValues[0]["value"]);

  response.send(JSON.stringify(returnValue));
  }
  else {

  console.log("Not a patient. No change to SAML assertion.");
  response.status(204).send();
  }

}
);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`SAML hook server listening on port ${port}`));
