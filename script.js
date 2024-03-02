function latexReplace(str) {
    function _allReplace(_str, _obj) {
        for (const x in _obj) {
            _str = _str.replace(new RegExp(x, 'g'), _obj[x]);
        }
        return _str;
    };

    _REPLACE_DICT = {
        "{": "",
        "}": "",
        "\\\\'e": "é",
        "\\\\'a": "á",
        "\\\\l": "ł"
    }

    return _allReplace(str, _REPLACE_DICT);
};


function processAuthors(authorStr){
    function _processAuthorName(nameStr) {
        const [lastName, firstName] = nameStr.split(', ');
        const initials = firstName.split(" ").map(n => n[0] + ". ").join('');
        return initials + lastName;
    };

    _AND_LITERAL = ' and '
    if (authorStr.includes(_AND_LITERAL)) {
        const authorNameList = authorStr.split(_AND_LITERAL).map(_processAuthorName);
        return authorNameList.slice(0, -1).join(', ') + _AND_LITERAL + authorNameList.at(-1);
    };

    return _processAuthorName(authorStr)
};


function formatBibString(bibEntry) {
    const tags = bibEntry.entryTags;

    var entryLines = []
    for (let tag in tags) {
        if (tags[tag] != "") {
            entryLines.push("\t" + tag + "=" + tags[tag] + ",");
        }
    }

    return `@${bibEntry.entryType}{${bibEntry.citationKey},\n${entryLines.join("\n")}\n}`
};


function getPubData(bibEntry) {
    const tags = bibEntry.entryTags;

    var venueStr = '';
    if ('booktitle' in tags) {
        if (bibEntry.entryType == 'phdthesis') {
            venueStr += tags.school;
        } else {
            venueStr += latexReplace(tags.booktitle);
        }
        venueStr +=  ', ' + tags.year;
    }
    if('note' in tags) {
        venueStr += ' (' + tags.note +')'
    }

    if (venueStr) {
        venueStr += '<br>'
    }

    return {
        "author": processAuthors(latexReplace(tags.author)),
        "title": latexReplace(tags.title),
        "venue": venueStr,
        "citationKey": bibEntry.citationKey,
        "bibentry": formatBibString(bibEntry),
    }
}


const PUBITEM = ({author, title, venue, citationKey, bibentry}) => 
`<div class="pubEntry" id="${citationKey}">
    ${author}<br>
    <b>${title}</b><br>
    ${venue}
    <a role="button" class="pdf-click" target="_blank">[PDF]</a> 
    <a role="button" class="code-click" target="_blank">[CODE]</a> 
    <a role="button" class="bib-click" href="javascript:;">[BIBTEX]</a>
    <div class="bibEntry">${bibentry}</div>
</div>`;


function makePubEntries(bibJSON) {
    var pubData = [];

    bibJSON.forEach(bibEntry => {
        pubData.push(getPubData(bibEntry));    
    })

    return pubData.map(PUBITEM)
};


$(document).ready(function() {
    const bibTypes = ["bandit", "bayesian", "applied"];
    const bibReady = [$.Deferred(), $.Deferred(), $.Deferred()];

    $.when.apply($, bibReady).then(function() {
        $(".bib-click").click(function(event) {
            $(this).next().toggle();
        });

        $.getJSON("pub_data.json", function (response) {
            $.each(response, (citationKey, value) => {
                pubEntryDiv = $(`#${citationKey}`);

                if (value.hasOwnProperty('code')) {
                    pubEntryDiv.children("a.code-click").attr('href', value.code).show();
                }

                if (value.hasOwnProperty('pdf')) {
                    pubEntryDiv.children("a.pdf-click").attr('href', value.pdf).show();
                }
            })
        })            

    })

    bibTypes.forEach((bibType, i) => {
        const fileName = "publications/" + bibType + ".bib";
        
        $.ajax({
            url: fileName,
            type: "GET",
            mimeType: 'text/plain; charset=UTF-8',
            success: function(response) {
                var entries = makePubEntries(bibtexParse.toJSON(response))
                $("#" + bibType).append(entries.join("<br>"))     
                bibReady[i].resolve();           
            }
        })

    })
})