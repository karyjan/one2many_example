var serverUrl = "/";
var localStream, room, recording, recordingId;

var streams = {};

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function startRecording () {
  if (room !== undefined){
    if (!recording){
      room.startRecording(localStream, function(id) {
        recording = true;
        recordingId = id;
      });
      
    } else {
      room.stopRecording(recordingId);
      recording = false;
    }
  }
}


function startViewer(){
    var config = {audio: false, video: false, data: true, screen: false, videoSize: [320, 180, 320, 180]};
    localStream = Erizo.Stream(config);
    createToken("viewer", "viewerWithData", function (response) {
        var token = response;
        console.log(token);
        room = Erizo.Room({token: token});

        localStream.addEventListener("access-accepted", function () {
            var subscribeToStreams = function (streams) {
                for (var index in streams) {
                    var stream = streams[index];
                    if (localStream.getID() !== stream.getID()) {
                        room.subscribe(stream);
                    }
                }
            };

            room.addEventListener("room-connected", function (roomEvent) {

                room.publish(localStream);
                subscribeToStreams(roomEvent.streams);

                roomEvent.streams.forEach(function(stream){
                    streams[stream.getID()] = stream;
                });

                updateOnlineCount();
                document.getElementById("viewerButton").disabled = true;
            });

            room.addEventListener("stream-subscribed", function(streamEvent) {
                var stream = streamEvent.stream;
                if(stream.hasVideo()) {
                    var div = document.createElement('div');
                    div.setAttribute("style", "width: 320px; height: 240px;");
                    div.setAttribute("id", "test" + stream.getID());

                    document.body.appendChild(div);
                    stream.show("test" + stream.getID());
                }


            });

            room.addEventListener("stream-added", function (streamEvent) {
                subscribeToStreams([streamEvent.stream]);
                document.getElementById("recordButton").disabled = false;
                console.log("stream id:" + streamEvent.stream.getID())

                streams[streamEvent.stream.getID()] = streamEvent.stream;
                updateOnlineCount();
            });

            room.addEventListener("stream-removed", function (streamEvent) {
                // Remove stream from DOM
                var stream = streamEvent.stream;
                console.log("stream id:" + stream.getID());
                if (stream.elementID !== undefined) {
                    var element = document.getElementById(stream.elementID);
                    document.body.removeChild(element);
                }

                delete streams[stream.getID()];
                updateOnlineCount();
            });

            room.addEventListener("stream-failed", function (streamEvent){
                console.log("STREAM FAILED, DISCONNECTION");
                room.disconnect();

            });

            room.addEventListener("room-disconnected", function(evt){
                console.log("room disconnected..");
                streams = {};
                updateOnlineCount();
            });
            room.connect();

            //localStream.show("myVideo");

        });

        localStream.addEventListener("stream-data", function(evt){
            console.log('Received data ', evt.msg, 'from stream ');
        });

        localStream.init();
    });
}

function startMaster(){

    recording = false;
    var screen = getParameterByName("screen");
    var config = {audio: true, video: true, data: true, screen: screen, videoSize: [320, 180, 320, 180]};
    // If we want screen sharing we have to put our Chrome extension id. The default one only works in our Lynckia test servers.
    // If we are not using chrome, the creation of the stream will fail regardless.
    if (screen){
        config.extensionId = "okeephmleflklcdebijnponpabbmmgeo";
    }
    localStream = Erizo.Stream(config);

    createToken("master", "presenter", function (response) {
        var token = response;
        console.log(token);
        room = Erizo.Room({token: token});

        localStream.addEventListener("access-accepted", function () {
            var subscribeToStreams = function (streams) {
                for (var index in streams) {
                    var stream = streams[index];
                    if (localStream.getID() !== stream.getID()) {
                        room.subscribe(stream);
                    }
                }
            };

            room.addEventListener("room-connected", function (roomEvent) {

                room.publish(localStream, {maxVideoBW: 300});
                subscribeToStreams(roomEvent.streams);
            });

            room.addEventListener("stream-subscribed", function(streamEvent) {
                var stream = streamEvent.stream;

                if(stream.hasVideo()) {
                    var div = document.createElement('div');
                    div.setAttribute("style", "width: 320px; height: 240px;");
                    div.setAttribute("id", "test" + stream.getID());

                    document.body.appendChild(div);
                    stream.show("test" + stream.getID());
                }

                streams[stream.getID()] = stream;
            });

            room.addEventListener("stream-added", function (streamEvent) {

                subscribeToStreams([streamEvent.stream]);
                document.getElementById("recordButton").disabled = false;
                console.log("stream id:" + streamEvent.stream.getID());
                streams[streamEvent.stream.getID()] = streamEvent.stream;

                updateOnlineCount();
            });

            room.addEventListener("stream-removed", function (streamEvent) {
                // Remove stream from DOM
                var stream = streamEvent.stream;
                console.log("stream id:" + stream.getID());
                if (stream.elementID !== undefined) {
                    var element = document.getElementById(stream.elementID);
                    document.body.removeChild(element);
                }
                delete streams[stream.getID()];

                updateOnlineCount();
            });

            room.addEventListener("stream-failed", function (streamEvent){
                console.log("STREAM FAILED, DISCONNECTION");
                room.disconnect();

            });

            room.connect();

            localStream.show("myVideo");

        });
        localStream.init();
    });
}

function createToken(userName, role, callback) {

    var req = new XMLHttpRequest();
    var url = serverUrl + 'createToken/';
    var body = {username: userName, role: role};

    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            callback(req.responseText);
        }
    };

    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
}


function updateOnlineCount(){
    document.getElementsByTagName("h1")[0].innerHTML = "当前在线人数：" + getObjectLength(streams);
}

function getObjectLength(obj){
    var count = 0;
    for(var key in obj)
    {
        if(obj.hasOwnProperty(key))
        {
            count++;
        }
    }
    return count;
}
