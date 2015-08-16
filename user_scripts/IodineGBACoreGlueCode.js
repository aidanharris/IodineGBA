"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var IodineGUI = {
    "Iodine":null,
    "Blitter":null,
    "timerID": null,
    "mixerInput":null,
    "settings":{
        "sound":true,
        "volume":1,
        "skipBoot":false,
        "toggleSmoothScaling":true,
        "toggleDynamicSpeed":false,
        "keyZones":[
            //Use this to control the key mapping:
            //A:
            [88, 74],
            //B:
            [90, 81, 89],
            //Select:
            [16],
            //Start:
            [13],
            //Right:
            [39],
            //Left:
            [37],
            //Up:
            [38],
            //Down:
            [40],
            //R:
            [50],
            //L:
            [49]
        ]
    }
};
window.onload = function () {
    //Initialize Iodine:
    IodineGUI.Iodine = new GameBoyAdvanceEmulator();
    //Initialize the timer:
    registerTimerHandler();
    //Initialize the graphics:
    registerBlitterHandler();
    //Initialize the audio:
    registerAudioHandler();
    //Register the save handler callbacks:
    registerSaveHandlers();
    //Register the GUI controls.
    registerGUIEvents();
    //Register GUI settings.
    registerGUISettings();
}
function registerTimerHandler() {
    var rate = 4;
    IodineGUI.Iodine.setIntervalRate(rate | 0);
    setInterval(function () {
        //Check to see if web view is not hidden, if hidden don't run due to JS timers being inaccurate on page hide:
        if (!document.hidden && !document.msHidden && !document.mozHidden && !document.webkitHidden) {
            if (document.getElementById("play").style.display == "none") {
                IodineGUI.Iodine.play();
            }
            IodineGUI.Iodine.timerCallback();
        }
        else {
            IodineGUI.Iodine.pause();
        }
    }, rate | 0);
}
function registerBlitterHandler() {
    IodineGUI.Blitter = new GlueCodeGfx();
    IodineGUI.Blitter.attachCanvas(document.getElementById("emulator_target"));
    IodineGUI.Iodine.attachGraphicsFrameHandler(function (buffer) {IodineGUI.Blitter.copyBuffer(buffer);});
}
function registerAudioHandler() {
    var Mixer = new GlueCodeMixer();
    IodineGUI.mixerInput = new GlueCodeMixerInput(Mixer);
    IodineGUI.Iodine.attachAudioHandler(IodineGUI.mixerInput);
}
function registerGUIEvents() {
    addEvent("keydown", document, keyDown);
    addEvent("keyup", document, keyUpPreprocess);
    addEvent("change", document.getElementById("rom_load"), fileLoadROM);
    addEvent("change", document.getElementById("bios_load"), fileLoadBIOS);
    addEvent("click", document.getElementById("play"), function (e) {
        IodineGUI.Iodine.play();
        this.style.display = "none";
        document.getElementById("pause").style.display = "inline";
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("pause"), function (e) {
        IodineGUI.Iodine.pause();
        this.style.display = "none";
        document.getElementById("play").style.display = "inline";
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("restart"), function (e) {
        IodineGUI.Iodine.restart();
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("sound"), function () {
        if (this.checked) {
            IodineGUI.Iodine.enableAudio();
        }
        else {
            IodineGUI.Iodine.disableAudio();
        }
    });
    addEvent("click", document.getElementById("skip_boot"), function () {
             if (this.checked) {
                IodineGUI.Iodine.enableSkipBootROM();
             }
             else {
                IodineGUI.Iodine.disableSkipBootROM();
             }
    });
    addEvent("click", document.getElementById("toggleSmoothScaling"), function () {
             if (IodineGUI.Blitter) {
                IodineGUI.Blitter.setSmoothScaling(this.checked);
             }
    });
    addEvent("click", document.getElementById("toggleDynamicSpeed"), function () {
             if (this.checked) {
                IodineGUI.Iodine.enableDynamicSpeed();
             }
             else {
                IodineGUI.Iodine.disableDynamicSpeed();
             }
    });
    addEvent("change", document.getElementById("import"), function (e) {
             if (typeof this.files != "undefined") {
                try {
                    if (this.files.length >= 1) {
                        writeRedTemporaryText("Reading the local file \"" + this.files[0].name + "\" for importing.");
                        try {
                            //Gecko 1.9.2+ (Standard Method)
                            var binaryHandle = new FileReader();
                            binaryHandle.onload = function () {
                                if (this.readyState == 2) {
                                    writeRedTemporaryText("file imported.");
                                    try {
                                        import_save(this.result);
                                    }
                                    catch (error) {
                                        writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                    }
                                }
                                else {
                                    writeRedTemporaryText("importing file, please wait...");
                                }
                            }
                            binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                        }
                        catch (error) {
                            //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                            var romImageString = this.files[this.files.length - 1].getAsBinary();
                            try {
                                import_save(romImageString);
                            }
                            catch (error) {
                                writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                            }
                        }
                    }
                    else {
                        writeRedTemporaryText("Incorrect number of files selected for local loading.");
                    }
                }
                catch (error) {
                    writeRedTemporaryText("Could not load in a locally stored ROM file.");
                }
             }
             else {
                writeRedTemporaryText("could not find the handle on the file to open.");
             }
             if (e.preventDefault) {
                e.preventDefault();
             }
    });
    addEvent("click", document.getElementById("export"), refreshStorageListing);
    addEvent("unload", window, ExportSave);
    IodineGUI.Iodine.attachSpeedHandler(function (speed) {
        var speedDOM = document.getElementById("speed");
        speedDOM.textContent = "Speed: " + speed;
    });
    addEvent("change", document.getElementById("volume"), function () {
        try {
             IodineGUI.settings.volume = Math.min(Math.max(parseInt(this.value), 0), 100) * 0.01;
        }
        catch (e) {}
        IodineGUI.mixerInput.setVolume(IodineGUI.settings.volume);
    });
}
function registerGUISettings() {
    document.getElementById("sound").checked = IodineGUI.settings.sound;
    if (IodineGUI.settings.sound) {
        IodineGUI.Iodine.enableAudio();
    }
    try {
        var volControl = document.getElementById("volume");
        volControl.min = 0;
        volControl.max = 100;
        volControl.step = 1;
        volControl.value = IodineGUI.settings.volume * 100;
    }
    catch (e) {}
    IodineGUI.mixerInput.setVolume(IodineGUI.settings.volume);
    document.getElementById("skip_boot").checked = IodineGUI.settings.skipBoot;
    if (IodineGUI.settings.skipBoot) {
        IodineGUI.Iodine.enableSkipBootROM();
    }
    else {
        IodineGUI.Iodine.disableSkipBootROM();
    }
    document.getElementById("toggleSmoothScaling").checked = IodineGUI.settings.toggleSmoothScaling;
    IodineGUI.Blitter.setSmoothScaling(IodineGUI.settings.toggleSmoothScaling);
    document.getElementById("toggleDynamicSpeed").checked = IodineGUI.settings.toggleDynamicSpeed;
    if (IodineGUI.settings.toggleDynamicSpeed) {
        IodineGUI.Iodine.enableDynamicSpeed();
    }
    else {
        IodineGUI.Iodine.disableDynamicSpeed();
    }
}
function resetPlayButton() {
    document.getElementById("pause").style.display = "none";
    document.getElementById("play").style.display = "inline";
}
function lowerVolume() {
    try {
        var volume = parseInt(document.getElementById("volume").value);
        volume = Math.min(Math.max(volume - 4, 0), 100);
        document.getElementById("volume").value = volume;
    }
    catch (e) {}
    IodineGUI.settings.volume = volume * 0.01;
    IodineGUI.mixerInput.setVolume(IodineGUI.settings.volume);
}
function raiseVolume() {
    try {
        var volume = parseInt(document.getElementById("volume").value);
        volume = Math.min(Math.max(volume + 4, 0), 100);
        document.getElementById("volume").value = volume;
    }
    catch (e) {}
    IodineGUI.settings.volume = volume * 0.01;
    IodineGUI.mixerInput.setVolume(IodineGUI.settings.volume);
}
function writeRedTemporaryText(textString) {
    if (IodineGUI.timerID) {
        clearTimeout(IodineGUI.timerID);
    }
    document.getElementById("tempMessage").style.display = "block";
    document.getElementById("tempMessage").textContent = textString;
    IodineGUI.timerID = setTimeout(clearTempString, 5000);
}
function clearTempString() {
    document.getElementById("tempMessage").style.display = "none";
}
//Some wrappers and extensions for non-DOM3 browsers:
function addEvent(sEvent, oElement, fListener) {
    try {    
        oElement.addEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.attachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}
function removeEvent(sEvent, oElement, fListener) {
    try {    
        oElement.removeEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.detachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}