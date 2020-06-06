/**
 * Heavily based on https://github.com/jvanharn/node-ht16k33
 * Converted from TypeScript back to Javascript and rewritten to fit
 * the needs of our application.
 * Author: Richard P. Gonzales
 * Email: richard@paperhousebrewing.com 
 * Last Modified: August 28, 2019
 **/
let i2c = require('i2c-bus');
let EventEmitter = require('eventemitter3');

const REGISTER_DISPLAY_SETUP = 0x80;
const REGISTER_SYSTEM_SETUP = 0x20;
const REGISTER_DIMMING = 0xE0;

const ADDRESS_KEY_DATA = 0x40;

const HT16K33_CMD_OSCILATOR = 0x20;
const HT16K33_CMD_OSCILATOR_ON = 0x01;
const HT16K33_CMD_OSCILATOR_OFF = 0x00;
const HT16K33_CMD_DISPLAY = 0x80;
const HT16K33_CMD_DISPLAY_ON = 0x01;
const HT16K33_CMD_DISPLAY_OFF = 0x00;
const HT16K33_CMD_BRIGHTNESS = 0xE0;

let BlinkRate = {
	Off : 0,
	Double : 1,
	Normal : 2,
	Half : 3
};

const UINT16_BUFFER_SIZE = 8;

/**
 * Represents the backpack.
 */
class LEDBackpack extends EventEmitter {
	constructor(bus, address) {
		super();
		this.address = parseInt(address);
		this.buffer = new Uint16Array(UINT16_BUFFER_SIZE);

		/**
		 * Whether or not the screen is on or off.
		 */
		this.state = HT16K33_CMD_DISPLAY_ON;

		this.wire = i2c.open(bus, err => {
			if (err == null) {
				//node.log('succesfully opened the bus ${bus}');
				//node.log('initializing the segmented display...');
				// Turn the oscillator on
				this.executeCommand(HT16K33_CMD_OSCILATOR | HT16K33_CMD_OSCILATOR_ON, 'HT16K33_CMD_OSCILATOR_ON')
				// Turn blink off
					.then(() => this.setBlinkrate(BlinkRate.Off))
					.then(() => this.setBrightness(10))
					.then(() => this.clear())
					.then(() => {
						//node.log('successfully initialized the segmented display.');
						this.emit('ready');
					})
					.catch((err) => {
						//node.error('unable to complete system startup!!:', err);
						this.emit('error', err);
					});
			} else {
				this.emit('error', err);
			}
		});
	}

	setBlinkRate(rate) {
		if (rate > BlinkRate.Half) {
			rate = BlinkRate.Off;
		}
		//node.log('changing blinkrate to "${Blinkrate[rate]}"...');
		return this.executeCommand(HT16K33_CMD_DISPLAY | this.state | (rate << 1), 'HT16K33_CMD_DISPLAY');
	}

	/**
	 * Set the brightness of the display.
	 *
	 * @param brightness A number from 0-15.
	 */
	setBrightness(brightness) {
		// brightness 0-15
		if (brightness > 15) {
			brightness = 15;
		}
		if (brightness < 0) {
			brightness = 0;
		}
		//node.log('changing brightness to level ${brightness}...');
		return this.executeCommand(HT16K33_CMD_BRIGHTNESS | brightness, 'HT16K33_CMD_BRIGHTNESS');
	}

	setBufferBlock(block, value, dot) {
		// Updates a single 16-bit entry in the 8*16-bit buffer
		if (block < 0 || block >= UINT16_BUFFER_SIZE) {
			// Prevent buffer overflow
			throw new Error('Buffer over- or underflow, tried to write block ${block}, which is out of range of 0-${UINT16_BUFFER_SIZE}.');
		}
		this.buffer[block] = value | (dot << 7);
	}

	writeDisplay() {
		//node.log('writing buffer to display...');
		var bytes = new Buffer.alloc(UINT16_BUFFER_SIZE * 2), // Create a UINT8 buffer for writing to the display
			i = 0;
		this.buffer.forEach(item => {
			// bytes[i++] = (item & 0xFF);
			// bytes[i++] = ((item >> 8) & 0xFF);
			bytes.writeUInt8(item & 0xFF, i++);
			bytes.writeUInt8(item >> 8, i++);
		});
		return new Promise((resolve, reject) => {
			this.wire.writeI2cBlock(this.address, 0x00, bytes.byteLength, bytes, (err, writtenBytes) => {
				if (err != null) {
					//node.log('[err] unable to write buffer!', err);
					reject(err);
				}
				//node.log('succesfully wrote buffer with size ${writtenBytes}');
				resolve();
			});
		});
	}

	clear() {
		for (let i = 0; i < UINT16_BUFFER_SIZE; i++) {
			this.buffer[i] = 0;
		}
		return this.writeDisplay();
	}

	/**
	 * Execute an command via I2C on the backpack and return the async promise.
	 *
	 * @param cmd Command to execute.
	 * @param debugName Name to log to the debug console
	 * @param arg Optionally an argument for it.
	 */
	executeCommand(cmd, debugName = 'command', arg = 0x00) {
		return new Promise((resolve, reject) => {
			this.wire.writeByte(this.address, cmd, arg, err => {
				if (err != null) {
					//node.log('[err] unable to execute command "${debugName}"!', err);
					reject(err);
				}
				//node.log('succesfully executed command "${debugName}"');
				resolve();
			});
		});
	}
}

module.exports = LEDBackpack