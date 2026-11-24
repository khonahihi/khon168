/***********************************************
> deleteHeader author:duyvinh09 - rewrite: Khon
***********************************************/	
if (typeof $request === "undefined" || !$request || !$request.headers) {
    $done({});
}

const headersToStrip = new Set(["x-revenuecat-etag", "if-none-match", "if-modified-since", "x-goog-if-none-match"]);
let modifiedHeaders = { ...$request.headers };

for (let key in modifiedHeaders) {
    if (headersToStrip.has(key.toLowerCase())) {
        delete modifiedHeaders[key];
    }
}

$done({ headers: modifiedHeaders });