//////////////////////////////////////////////////
// Desktop interface functions
// DesktopInterface is the native bridge exposed by the desktop shell.
//////////////////////////////////////////////////

let mediacounter = 0;
let sounds = {};

function invoke (command, args, fcn) {
    var bridge = window.DesktopInterface;
    if (!bridge || typeof bridge[command] !== 'function') {
        if (fcn) {
            var fallback = command === 'database_query' ? '[]' : 'success';
            fcn(fallback);
        }
        return;
    }
    var result = bridge[command](args);
    if (result && typeof result.then === 'function') {
        result.then(function (value) {
            if (fcn) {
                fcn(value);
            }
        });
    } else if (fcn) {
        fcn(result);
    }
}

export default class Desktop {
    static getsettings (fcn) {
        if (window.DesktopInterface && typeof window.DesktopInterface.io_getsettings === 'function') {
            invoke('io_getsettings', {}, fcn);
            return;
        }
        if (fcn) {
            fcn(',,,');
        }
    }

    static stmt (json, fcn) {
        invoke('database_stmt', {json: JSON.stringify(json)}, fcn);
    }

    static query (json, fcn) {
        invoke('database_query', {json: JSON.stringify(json)}, function (result) {
            if (typeof result === 'object') {
                result = JSON.stringify(result);
            }
            if (fcn) {
                fcn(result);
            }
        });
    }

    static getmedia (file, fcn) {
        if (!window.DesktopInterface) {
            if (fcn) {
                fcn('');
            }
            return;
        }
        mediacounter++;
        var key = mediacounter;
        invoke('io_getmedialen', {file: file, key: key}, function (length) {
            Desktop.processdata(key, 0, length, '', fcn);
        });
    }

    static getmediadata (key, offset, length, fcn) {
        invoke('io_getmediadata', {key: key, offset: offset, length: length}, fcn);
    }

    static processdata (key, offset, length, oldstr, fcn) {
        if (length === 0) {
            Desktop.getmediadone(key);
            if (fcn) {
                fcn(oldstr);
            }
            return;
        }
        var newlen = (length < 100000) ? length : 100000;
        Desktop.getmediadata(key, offset, newlen, function (str) {
            Desktop.processdata(key, offset + newlen, length - newlen, oldstr + str, fcn);
        });
    }

    static getmediadone (key, fcn) {
        invoke('io_getmediadone', {key: key}, fcn);
    }

    static setmedia (str, ext, fcn) {
        invoke('io_setmedia', {content: str, extension: ext}, fcn);
    }

    static setmedianame (str, name, ext, fcn) {
        invoke('io_setmedianame', {content: str, name: name, extension: ext}, fcn);
    }

    static registerSound (dir, name, fcn) {
        var register = function (source) {
            var sound;
            try {
                sound = new Audio(source);
            } catch (e) {
                if (fcn) {
                    fcn('error');
                }
                return;
            }
            sound.preload = 'auto';
            sound.addEventListener('ended', function () {
                if (window.ScratchAudio) {
                    window.ScratchAudio.soundDone(name);
                }
            });
            sound.addEventListener('error', function () {
                if (fcn) {
                    fcn('error');
                }
            }, {once: true});
            sound.addEventListener('loadedmetadata', function () {
                sounds[name] = sound;
                if (fcn) {
                    fcn(name + ',' + sound.duration);
                }
            }, {once: true});
        };

        if (dir === 'Documents') {
            this.getfile(name, function (content) {
                var extension = name.substring(name.lastIndexOf('.') + 1);
                register('data:audio/' + extension + ';base64,' + content);
            });
        } else {
            register(dir + name);
        }
    }

    static playSound (name, fcn) {
        var sound = sounds[name];
        if (!sound) {
            if (fcn) {
                fcn(name + ' not found');
            }
            return;
        }
        sound.currentTime = 0;
        var result = sound.play();
        if (result && typeof result.catch === 'function') {
            result.catch(function () {
                // Browsers may reject playback until the user has interacted.
            });
        }
        if (fcn) {
            fcn(name + ' played');
        }
    }

    static stopSound (name, fcn) {
        var sound = sounds[name];
        if (!sound) {
            if (fcn) {
                fcn(name + ' not found');
            }
            return;
        }
        sound.pause();
        sound.currentTime = 0;
        if (fcn) {
            fcn(name + ' stopped');
        }
    }

    static sndrecord (fcn) {
        invoke('recordsound_recordstart', {}, fcn);
    }

    static recordstop (fcn) {
        invoke('recordsound_recordstop', {}, fcn);
    }

    static volume (fcn) {
        invoke('recordsound_volume', {}, fcn);
    }

    static startplay (fcn) {
        invoke('recordsound_startplay', {}, fcn);
    }

    static stopplay (fcn) {
        invoke('recordsound_stopplay', {}, fcn);
    }

    static recorddisappear (visible, fcn) {
        invoke('recordsound_recordclose', {visible: visible}, fcn);
    }

    static hascamera () {
        if (!window.DesktopInterface || typeof window.DesktopInterface.scratchjr_cameracheck !== 'function') {
            return false;
        }
        return window.DesktopInterface.scratchjr_cameracheck({});
    }

    static startfeed (data, fcn) {
        invoke('scratchjr_startfeed', {data: JSON.stringify(data)}, fcn);
    }

    static stopfeed (fcn) {
        invoke('scratchjr_stopfeed', {}, fcn);
    }

    static choosecamera (mode, fcn) {
        invoke('scratchjr_choosecamera', {mode: mode}, fcn);
    }

    static captureimage (fcn) {
        invoke('scratchjr_captureimage', {}, fcn);
    }

    static createZipForProject (projectData, metadata, name, fcn) {
        invoke('createZipForProject', {
            projectData: projectData,
            metadata: JSON.stringify(metadata),
            name: name
        }, fcn);
    }

    static sendSjrToShareDialog (fileName, emailSubject, emailBody, shareType) {
        invoke('sendSjrUsingShareDialog', {
            fileName: fileName,
            emailSubject: emailSubject,
            emailBody: emailBody,
            shareType: shareType
        });
    }

    static deviceName (fcn) {
        invoke('deviceName', {}, fcn);
    }

    static analyticsEvent (category, action, label) {
        invoke('analyticsEvent', {category: category, action: action, label: label});
    }

    static setAnalyticsPlacePref (preferredPlace) {
        invoke('setAnalyticsPlacePref', {preferredPlace: preferredPlace});
    }

    static setAnalyticsPref (key, value) {
        invoke('setAnalyticsPref', {key: key, value: value});
    }

    static getfile (name, fcn) {
        invoke('io_getfile', {name: name}, fcn);
    }

    static setfile (name, str, fcn) {
        invoke('io_setfile', {name: name, content: btoa(str)}, fcn);
    }

    static remove (name, fcn) {
        invoke('io_remove', {name: name}, fcn);
    }

    static getmd5 (str, fcn) {
        invoke('io_getmd5', {content: str}, fcn);
    }
}
