var pvds = {
	"Cable" : {name:"Cable", address:"2001:2232::1"},
	"DSL" : {name:"DSL", address:"2001:2232::1"}
}

var selected = null

var { Frame } = require("sdk/ui/frame");
var { Toolbar } = require("sdk/ui/toolbar");

var origin = null
var source = null

function updatePVDs() {
	var m = {action:"updatePVDs", pvds:pvds}
	if (selected == null)
		for(var k in pvds) {
			selected = k
			break
		}
	if (selected != null)
		m["selected"] = selected
	source.postMessage(m, origin)
}

function rcvMessage(e) {
	console.log("Received message: "+JSON.stringify(e.data));
	if(e.data.action == "PVDchanged") {
		selected = e.data.value;
		write()
	} else if (e.data.action == "register") {
		origin = e.origin
		source = e.source
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
	out = read()
	addrs = out.split("\n")
	pvds = {}
	for (var i = 0; i<addrs.length; i++) {
		addrs[i]=addrs[i].split(",")		
		if(addrs[i] != "")
			pvds[addrs[i][0]] = {name:addrs[i][1], address:addrs[i][2]}
	}
}


function write() {
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
	file.initWithPath("/home/pierre/ietf94hackathon/pick-pvd/address");
	var s = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	s.init(file, -1, -1, 0);
	/*var sstream = Cc["@mozilla.org/scriptableoutputstream;1"].createInstance(Ci.nsIScriptableOutputStream);
	sstream.init(s);
	sstream.write(pvds[selected].address);
	sstream.close();*/
	console.log("Writing chosen address: "+pvds[selected].address);
	s.write(pvds[selected].address, pvds[selected].address.length)
	s.close();
}


