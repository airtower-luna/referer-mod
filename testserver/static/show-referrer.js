document.getElementById("referrer").innerText = document.referrer;
document.getElementById("referrer-reflect").innerText =
	Reflect.getOwnPropertyDescriptor(Document.prototype, 'referrer')
	.get.call(document);
