var pvds = {}

var selected = null

var { Frame } = require("sdk/ui/frame");
var { Toolbar } = require("sdk/ui/toolbar");

var origin = null
var source = null

function updatePVDs() {
	var m = {action:"updatePVDs", pvds:pvds}
	/*if (selected == null)
		for(var k in pvds) {
			selected = k
			break
		}*/
	if (selected != null) {
		m["selected"] = selected
		m["pvd"] = pvds[selected]
	}
	source.postMessage(m, origin)
}

function rcvMessage(e) {
	console.log("Received message: "+JSON.stringify(e.data));
	if(e.data.action == "PVDchanged") {
		selected = (e.data.value=="none")?null:e.data.value;
                updatePVDs()
		write()
	} else if (e.data.action == "register") {
		origin = e.origin
		source = e.source
		finishUpdate()
		getAddresses()
		updatePVDs()
		write()
	} else if (e.data.action == "update") {
		getAddresses()
		updatePVDs()
		write()
	}
}

var frame = new Frame({
  url: "./pvdbar.html",
  onMessage: rcvMessage
});

var toolbar = Toolbar({
  name: "pvd-bar",
  title: "Pick your PVD",
  items: [frame]
});


const {Cc, Ci} = require("chrome");

function getAddr() {
    var localFile = Cc["@mozilla.org/file/local;1"]
        .createInstance(Ci.nsILocalFile)
    localFile.initWithPath('/bin/bash');

    var process = Cc["@mozilla.org/process/util;1"]
        .createInstance(Ci.nsIProcess);
    process.init(localFile);

    var args = [ "/home/pierre/ietf94hackathon/pick-pvd/data/getaddr.sh" ,
		"/home/pierre/ietf94hackathon/pick-pvd/data/getaddr.sh.out" ];
    var rc = process.runAsync(args, args.length, 
        function(subject, topic, data) {
            console.log('subject=' + subject + ', topic=' + topic + ', data=' + data);
            console.log('bash script finished executing, returned ' + process.exitValue);
            finishUpdate()
    });

    return rc;
}

function read() {
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
	file.initWithPath("/home/pierre/ietf94hackathon/pick-pvd/data/getaddr.sh.out");
	var s = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	s.init(file, -1, 0, 0);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	sstream.init(s);
	var output = sstream.read(sstream.available());
	sstream.close();
	s.close();
	console.log("OUT:"+output);
	return output
}

function getAddresses() {
	getAddr()
}

function finishUpdate() {
	console.log("---------------FINISH UPDATE");
	out = read()
	addrs = out.split("\n")
	pvds = {}
	for (var i = 0; i<addrs.length; i++) {
		addrs[i]=addrs[i].split(",")	
		if(addrs[i].length >= 2) {
			console.log("Adding PVD : "+addrs[i][1]);
			pvds[addrs[i][0]] = {name:addrs[i][1], addresses:addrs[i][2].split("-")}
		}
	}
}


function write() {
        if(selected == null)
		return
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
	file.initWithPath("/home/pierre/ietf94hackathon/pick-pvd/address");
	var s = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	if(selected == null) {
		//s.write("", 0)
		s.close();
	} else {
		s.init(file, -1, -1, 0);
	        a = pvds[selected].addresses.join(",")
	        console.log("Writing chosen addresses: "+a);
		s.write(a, a.length)
		s.close();
	}
}


