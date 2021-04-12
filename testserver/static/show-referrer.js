document.getElementById("referrer").innerText = document.referrer;
document.getElementById("referrer-reflect").innerText =
	Reflect.getOwnPropertyDescriptor(Document.prototype, 'referrer')
	.get.call(document);

var myiframe = document.getElementById('myiframe');
var documentPrototype = Reflect.getPrototypeOf(
	Reflect.getPrototypeOf(myiframe.contentWindow.document));
var getReferrer =
	Reflect.getOwnPropertyDescriptor(documentPrototype, 'referrer').get;
document.getElementById("referrer-iframe").innerText =
	getReferrer.call(document);
