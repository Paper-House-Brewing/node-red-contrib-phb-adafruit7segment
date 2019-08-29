/**
 * Author: Richard P. Gonzales
 * Email: richard@paperhousebrewing.com 
 * Last Modified: August 28, 2019
 **/
 
module.exports = function(RED) {
    function PHB_Adafruit7Segment(config) {
        RED.nodes.createNode(this,config);
        let node = this;		
		let LEDBackpack = require('./led_backpack.js');
		let display = new LEDBackpack(config.i2c_bus, config.i2c_address);
		//Hexadecimal character lookup table (0..9)
		let digits = {
			'0' : 0x3F, /* 0 */
			'1' : 0x06, /* 1 */
			'2' : 0x5B, /* 2 */
			'3' : 0x4F, /* 3 */
			'4' : 0x66, /* 4 */
			'5' : 0x6D, /* 5 */
			'6' : 0x7D, /* 6 */
			'7' : 0x07, /* 7 */
			'8' : 0x7F, /* 8 */
			'9' : 0x6F, /* 9 */
			'.' : 0x01, /* a */
			' ' : 0x00  /*   */
		};
		
		// Setup our default
		display.clear();
		display.setBrightness(config.brightness);
		display.setBlinkRate(config.blink_rate);

        node.on('input', function(msg) {
			// Make sure we have a number 
			let num = parseFloat(msg.payload);
			// Make sure our parsed value is a number
			if (isNaN(num)) {
				node.error("The value provided is not a real number.");
				return false;
			}
			// Now make sure we have one decimal place and convert back to string
			let numStr = num.toFixed(1);	// WARNING!! Do not rely on toFixed to round with precision
			// Setup the padding 
			let gap = 4 - numStr.replace('.', '').length;
			// Clear the display
			display.clear();
			// Print the padding
			//node.log("Gap size " + gap);
			//node.log("Value of " + numStr);
			// Setup the array of the numStr
			numStr = numStr.replace('.', '').split('');
			// Now write the value to the display
			let sColon = false;
			// This is for a 4 digit seven segment so limit to 4
			for (let i=0;i<=4;i++) {
				if (gap > 0) {
					// Print blanks
					//node.log("Print a blank @ " + i + " Gap:" + gap);
					display.setBufferBlock(i, 0x00); 
					gap--;
				} else if (i == 2) {
					// Don't show the colon
					//node.log("Insert 0x00 for no colon to show");
					display.setBufferBlock(2, 0x00);
				} else {
					let _char = numStr.shift(); // Grab the first character to print and remove it from our array
					//node.log("Try and insert " + _char + " lookup value " + digits[_char] + " @ " + i);
					display.setBufferBlock(i, digits[_char], i==3 ? true : false); // Print the digit
				}
			}
			display.writeDisplay();
            node.send(msg);
        });
    }
    RED.nodes.registerType("phb-adafruit7segment",PHB_Adafruit7Segment);
};