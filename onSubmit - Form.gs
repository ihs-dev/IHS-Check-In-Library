// ******** GLOBAL DECLARATIONS *********** //
/* Question order */
  const form_questionOrder = [
    "firstName",
    "lastName",
    "apptTime",
    "therapistToBeSeen",
    "changesToInfo_YES_NO",
    "acknowledgementOfFees",
    "checkInTime"
  ];
// ******* END GLOBAL DECLARATIONS ******** //

function getFormItemIndexAndId(substringCharNumForTitle) {
  // !!!! substringCharNumForTitle = # of characters to get for the title
  var form = FormApp.getActiveForm();
  var items = form.getItems();
  var indexedItems = [];
  substringCharNumForTitle = substringCharNumForTitle ? substringCharNumForTitle : 1000;

  for ( let i = 0; i < items.length; i++) {
    var itemTitle = items[i].getTitle().substring(0, substringCharNumForTitle);
    var itemId = items[i].getId();
    var itemIndex = items[i].getIndex();
    var itemObj = {
      itemTitle: itemTitle,
      itemId: itemId,
      itemIndex: itemIndex
    }
    Logger.log(
      `[itemIndex: ${itemIndex}]  [itemTitle: ${itemTitle}]  [itemId: '${itemId}']`
    );
    indexedItems.push(itemObj);
  }

  Logger.log(`indexedItems = ${JSON.stringify(indexedItems)}`);
  return indexedItems;
}

function getResponses() {
  var form = FormApp.getActiveForm();
  var response = form.getResponses().pop();
  var itemResponses = response.getItemResponses();
  var cleanedResponses = [];
  for (var i = 0; i < itemResponses.length; i++) {
    var responseValue = `[${i}] ${itemResponses[i].getResponse()}`
    responseValue = responseValue.replace(/"/g, "");
    responseValue = responseValue.replace(/\n/g, "\\\n");
    cleanedResponses.push(responseValue);
  }
  Logger.log(cleanedResponses)
}

/**
 * Gets the responses from FormApp.getActiveForm().getResponses().pop().getItemResponses().getResponse() for each item on the form.
 * 
 * The responses get turned into an object literal using the 'from_questionOrder' const declared on 'IHS Check-In Library' on the 'onSubmit - Form.gs'.
 * 
 * Returns an object literal with question titles as keys and the response as the corresponding value.
 */
function getAndLabelFormResponses(addTimeStampToEndAsBoolean) {
  var thisFunction = `[${thisProject}]: getAndLabelFormResponses()\n`
  Logger.log(`${thisFunction} initiated...`)
  var form = FormApp.getActiveForm();
  var response = form.getResponses().pop();
  var itemResponses = response.getItemResponses();
  //Logger.log(`itemResponses.length = ${itemResponses.length}`);
  //Logger.log(`form_questionOrder.length = ${form_questionOrder.length}`)

  // Go through the form_questionOrder and assign values
  Logger.log(`${thisFunction} - looping through form_questionOrder and assigning keys/values...`)
  var responseObj = {};
  for (var i = 0; i < itemResponses.length; i++) {
    var responseKey = form_questionOrder[i];
    var responseValue = itemResponses[i].getResponse();
    //Logger.log(`itemResponses[${i}].getResponse()=${itemResponses[i].getResponse()}`);
    responseValue = responseValue.replace(/"/g, "");
    responseValue = responseValue.replace(/\n/g, "\\\n");
    responseObj[responseKey] = responseValue;
  }

  if( addTimeStampToEndAsBoolean == true) {
    var today = new Date();
    var now = Utilities.formatDate(today, Session.getScriptTimeZone(), "HH:mm:ss");
    responseObj["checkInTime"] = now;
  }

  Logger.log(`${thisFunction} - completed`);
  //Logger.log(`responseObj = ${JSON.stringify(responseObj)}`);
  return responseObj;
  
}

/**
 * Sends an email (getTherapistsNamesAndEmails().workEmail) based on a match between getTherapistsNamesAndEmails().wholePreferredName and form_questionOrder(responseObj).therapistToBeSeen
 */
function sendCheckInEmail_byTherapistName(responseObj, numOfRetries) {
  var thisFunction = `[${thisProject}]: sendCheckInEmail_byTherapistName()\n`;
  Logger.log(`${thisFunction} initialized...`)

  numOfRetries = numOfRetries || 5;
  var therapistToBeSeen = responseObj.therapistToBeSeen;
  Logger.log(`${thisFunction}:: therapistToBeSeen = ${therapistToBeSeen}`);
  var therapists = getTherapistsNamesAndEmails() || [];
  //Logger.log(`${thisFunction}:: therapists = ${JSON.stringify(therapists)}`);
  
  // Go through 'therapists' and see if there's a match between therapistToBeSeen and wholePreferredName
  if ( therapists.length === 0 || therapists.hasError === true) {
    // ########### INSERT WHAT TO DO WITH ERROR HANDLING HERE ##############
    Logger.log(`ERROR while running ${thisFunction}
    therapists.length = ${therapists.length}
    therapists.hasError = ${therapists.hasError}
    therapists.errStack = ${therapists.errStack}`);
    return;
  }

  // If no error, go ahead and compare wholePreferredName and therapistToBeSeen and send email based on match.
  for( let i = 0; i < therapists.length; i++) {
    Logger.log(`${thisFunction} → Comparing wholePreferredName and therapistToBeSeen `);
    var wholePreferredName = therapists[i]['wholePreferredName'];
    var workEmail = therapists[i]['workEmail'];
    var client = `${responseObj.firstName} ${responseObj.lastName.substring(0, 1)}`;
    var checkInTime = responseObj.checkInTime;
    var apptTime = responseObj.apptTime;
    var changesToInfo_YES_NO = responseObj.changesToInfo_YES_NO;
    //Logger.log(`wholePreferredName = ${wholePreferredName}
    //  var workEmail = ${therapists[i]['workEmail']}`);

    if( wholePreferredName.toLowerCase() == therapistToBeSeen.toLowerCase() ) {
      Logger.log(`${thisFunction} MATCH FOUND!\nFor: wholePreferredName [${wholePreferredName}] == therapistToBeSeen [${therapistToBeSeen}]
      ► Preparing to send email to 'workEmail': [${workEmail}]`);
      var recipient = workEmail;
      var subject = `${client} is here for their ${apptTime} appointment!`;
      var messageBody = `${client} is here for their ${apptTime} appointment!` +
                        `\n\nCheck-In Time: ${checkInTime}` +
                        (changesToInfo_YES_NO.toUpperCase() === 'YES' ? `\n\nNeeds to update insurance and/or personal information?: [YES]` : '');
      var rawMessage ="To: " + recipient + "\r\n" +
                      "Subject: " + subject + "\r\n\r\n" +
                      messageBody;

      var sendRequest = {id: null};
      var retries = 1;
      /*
      while (!sendRequest.id && retries <= numOfRetries) {
        try {
          var base64EncodedEmail = Utilities.base64EncodeWebSafe(rawMessage);
          sendRequest = Gmail.Users.Messages.send({raw: base64EncodedEmail}, 'me');
          
          if (sendRequest.id) {
            Logger.log(`${thisFunction}Email sent with ID: ${sendRequest.id}`);
            var emailDetails = Gmail.Users.Messages.get('me', sendRequest.id);
            Logger.log(emailDetails);
            return emailDetails;
          }
        } catch(e) {
          Logger.log(`Attempt ${retries} failed. Error: ${e.message}`);
          if (retries === numOfRetries) {
            return {
              hasError: true,
              errStack: e.stack
            };
          }
        }
        retries++;
      }
      */
      try {
        MailApp.sendEmail(
          workEmail,
          `${client} is here for their ${apptTime} appointment!`,
          `${client} is here for their ${apptTime} appointment!` +
          `\n\nCheck-In Time: ${checkInTime}` +
          (changesToInfo_YES_NO.toUpperCase() === 'YES' ? `\n\nNeeds to update insurance and/or personal information?: [YES]` : '')
        );
        var today = new Date();
        var now = Utilities.formatDate(today, Session.getScriptTimeZone(), "M/d/yyyy @ HH:mm:ss");
        Logger.log(`${thisFunction}[${now}] Check-in email successfully sent to '${workEmail}'!`);
        return; // Exit the function since the email has been sent.
      } catch(e) {
        Logger.log(`${thisFunction}FATAL ERROR SENDING A CHECK-IN EMAIL TO ${wholePreferredName} AT '${workEmail}' FOR THEIR ${apptTime} APPOINTMENT\n\ne.stack = \n${e.stack}`)
        MailApp.sendEmail(
          ERROR_EMAILS,
          `FATAL ERROR SENDING A CHECK-IN EMAIL TO ${wholePreferredName} AT '${workEmail}' FOR THEIR ${apptTime} APPOINTMENT`,
          `e.stack = ${e.stack}`
        );
        return; // Exit since the function has sent errorEmail.
      }
    } 
  }
  // !!!!!!!!!!!!! EXIT THE FUNCTION IF A THERAPIST IS FOUND !!!!!!!!!!!!!!!!!!
  // ########## CODE HERE ABOUT WHAT TO DO IF THE EMAIL HAS FAILED TO SEND X AMOUNT OF TIMES ################//
  Logger.log(`${thisFunction} ERROR Failed to send email after ${retries} retries. Looks like no matching therapist name was found.`);
  return {hasError: true, message: `Failed to send email after ${retries} retries. Looks like no matching therapist name was found.`};
}
