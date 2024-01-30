const thisProject = 'IHS Check-In Library';
const ERROR_EMAILS = "jimi@eta-agency.us, jimi@ihealthservices.org, mknight@ihealthservices.org";

// ******* THERAPISTS EMAIL ADDRESSES ***** //
  var MainDashboard = {
    ssId: '1B1MZUm6xTyzz2LaMRTXCdxL0DH0ye8myvoMbYvmTxRQ',
    empsConts: {
      sheetName: 'Employees_Contractors',
      sheetId: '0'
    },
    getTherapists: {
      sheetName: 'getTherapists',
      sheetId: '294546361',
      headerRow: 20,
      startRow: 21,
      startCol: 4
    }
  }

  /**
   * On the !DASHBOARD spreadsheet, gets a list of the therapists and adds them to an object literal based on the headers.
   */
  function getTherapistsNamesAndEmails() {
    var thisFunction = `[${thisProject}] getTherapistsNamesAndEmails() on 'global declarations.gs'\n`;

    Logger.log(`${thisFunction} initialized...`)

    
    var sheetName = MainDashboard.getTherapists.sheetName;
    var headerRow = MainDashboard.getTherapists.headerRow;
    var startRow = MainDashboard.getTherapists.startRow;
    var startCol = MainDashboard.getTherapists.startCol;

    var ss = SpreadsheetApp.openById(MainDashboard.ssId);
    var sheet = ss.getSheetByName(sheetName);

    try {
      // Get the headers - these will be the Keys for the objects
      Logger.log(`${thisFunction}:: Getting headers from sheet: '${sheetName}'`)
      var headers = sheet.getRange(headerRow, startCol, 1, sheet.getLastColumn()).getValues();
      headers = headers.flat()
      headers =  headers.filter(row => row !== '') // Filter blanks

      // Get the data from the dataRange of the sheet
      Logger.log(`${thisFunction}:: Getting data from from sheet: '${sheetName}'`)
      var data = sheet.getRange(startRow, startCol, sheet.getLastRow(), sheet.getLastColumn()).getValues();
      data = data.filter(row => row[0] !=='');
      

      // Get the data from 'data' and create an object with headers as keys
      Logger.log(`${thisFunction}:: Creating objects based on headers: ${JSON.stringify(headers)}`)
      var therapists = [];
      for ( let i = 0; i < data.length; i++) { // Go through data
        var therapist = {};
        for ( let j = 0; j < headers.length; j++) {
          var header = headers[j];
          therapist[header] = data[i][j]
        }
        therapists.push(therapist);
      }

      Logger.log(`${thisFunction}:: therapists = ${JSON.stringify(therapists)}`);
      return therapists;
    } catch(e) {
      return {
        hasError: true,
        errStack: e.stack
      }
    }
    
    
  }
// ******* END THERPAISTS EMAIL ADDRESSES * //
