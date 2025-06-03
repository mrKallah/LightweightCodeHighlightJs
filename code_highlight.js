function copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    text = text.slice(0, -5);
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}

function syntaxHighlight(code) {

    // Escape HTML tags to prevent them from being interpreted
    code = code.replaceAll("<", "&lt;").replaceAll("&gt;", ">");

    // Save tags first
    let tags = Array.from(code.matchAll(/<[^>]*>/g), m => m[0]);
    for (let i = 0; i < tags.length; i++) {
        if (["<br>", "<br/>", "<br />"].includes(tags[i])) {
            code = code.replace(tags[i], "<br/>");
        } else {
            code = code.replace(tags[i], `|syntax_highlighting_tag_${i}|`);
        }
    }

    // Replace class keyword placeholders
    code = code.replace(/class/g, "kallahclass");

    // Replace URLs with placeholders
    let urls = [];
    code = code.replace(/\bhttps?:\/\/[^\s<>"']+/g, match => {
        let placeholder = `|url_${urls.length}|`;
        urls.push(match);
        return placeholder;
    });

    // Highlight strings first, replace them with placeholders to hide them
    let strings = [];
    code = code.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, match => {
        let placeholder = `|str_${strings.length}|`;
        strings.push(match);
        return placeholder;
    });

    // // Now highlight comments on code WITHOUT strings
    code = code.replace(/#(.*?)(\r\n|\r|\n|<br\/?>|$)/g, (m, p1, p2) => `kallahcommentspan#${p1}kallahendspan${p2}`);
    code = code.replace(/(?<!:)\/\/(.*?)(\r\n|\r|\n|<br\/?>|$)/g, (m, p1, p2) => `kallahcommentspan//${p1}kallahendspan${p2}`);
    code = code.replace(/\/\*(.*?)\*\//gs, (m, p1) => `kallahcommentspan/*${p1}*/kallahendspan`);
    code = code.replace(/"""(.*?)"""/gs, (m, p1) => `kallahcommentspan"""${p1}"""kallahendspan`);
    code = code.replace(/'''(.*?)'''/gs, (m, p1) => `kallahcommentspan'''${p1}'''kallahendspan`);

    // Put strings back, wrapping with your tags
    for (let i = 0; i < strings.length; i++) {
        const escapedStr = strings[i].replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1'); // escape regex chars
        const re = new RegExp(`\\|str_${i}\\|`, 'g');
        code = code.replace(re, () => `kallahstrdiv${strings[i]}kallahenddiv`);
    }

    // Remove nested tags as before
    code = removeNestedTags(code);

    // Highlight numbers
    code = code.replace(/\b(\d+)\b/g, 'kallahnumberdiv$1kallahendspan');

    // Highlight keywords
    code = code.replace(/\b(def|for|while|do|if|else|elif|switch|case|default|break|continue|return|assert|True|False|None|int|float|double|string|char|bool|void|public|private|protected|kallahclass|struct|static|new|delete|function|var|let|const|true|false|null|import|from|as|if|elif|else|while|for|break|continue|return)\b/g, 'kallahkeywordspan$1kallahendspan');

    // Restore saved tags
    for (let i = 0; i < tags.length; i++) {
        code = code.replace(`|syntax_highlighting_tag_${i}|`, tags[i]);
    }

    // Highlight shell commands and flags in the same line
    code = code.replace(/^(?:\s*)(curl|bash|sh)\b(.*)$/gm, (full, cmd, rest) => {
        // Highlight shell command
        let highlightedCmd = `kallahshellpan${cmd}kallahendspan`;

        // Highlight flags (e.g., --param, -x)
        let highlightedRest = rest.replace(/\s(--?[a-zA-Z0-9_-]+)/g, ' <span class="param">$1</span>');

        return `${highlightedCmd}${highlightedRest}`;
    });


    // Replace placeholders with HTML
    code = code.replaceAll("kallahcommentspan", '<span class="comment">');
    code = code.replaceAll("kallahstrdiv", '<div class="str">');
    code = code.replaceAll("kallahnumberdiv", '<span class="number">');
    code = code.replaceAll("kallahkeywordspan", '<span class="keyword">');
    code = code.replaceAll("kallahshellpan", '<span class="shell">');
    code = code.replaceAll("kallahendspan", '</span>');
    code = code.replaceAll("kallahenddiv", '</div>');
    code = code.replaceAll("\\", '<span class="specialChar">\\</span>');

    // Links
    for (let i = 0; i < urls.length; i++) {
        const re = new RegExp(`\\|url_${i}\\|`, 'g');
        code = code.replace(re, `<a href="${urls[i]}" target="_blank" rel="noopener noreferrer">${urls[i]}</a>`);
    }

    return code;
}



function removeNestedTags(code) {
    const openTags = ['kallahcommentspan', 'kallahstrdiv'];
    const closeTags = ['kallahendspan', 'kallahenddiv'];

    const tokenRegex = /(kallahcommentspan|kallahstrdiv|kallahendspan|kallahenddiv)/g;
    let tokens = code.split(tokenRegex);

    const stack = [];
    const output = [];

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        if (openTags.includes(token)) {
            const parentTag = stack.length ? stack[stack.length - 1] : null;
            const isNestedCommentInString = (token === 'kallahcommentspan' && parentTag === 'kallahstrdiv');
            const isNestedStringInComment = (token === 'kallahstrdiv' && parentTag === 'kallahcommentspan');

            if (isNestedCommentInString || isNestedStringInComment) {
                // Skip nested tag's open and close tags, but keep inner content
                let openTag = token;
                let closeTag = openTag === 'kallahcommentspan' ? 'kallahendspan' : 'kallahenddiv';
                let depth = 1;
                i++;

                while (i < tokens.length && depth > 0) {
                    if (tokens[i] === openTag) depth++;
                    else if (tokens[i] === closeTag) depth--;
                    else if (depth === 1) output.push(tokens[i]);
                    i++;
                }
                i--; // Adjust outer loop index
            } else {
                stack.push(token);
                output.push(token);
            }
        } else if (closeTags.includes(token)) {
            if (stack.length) {
                let openTag = stack[stack.length - 1];
                if (
                    (token === 'kallahendspan' && openTag === 'kallahcommentspan') ||
                    (token === 'kallahenddiv' && openTag === 'kallahstrdiv')
                ) {
                    stack.pop();
                    output.push(token);
                } else {
                    output.push(token);
                }
            } else {
                output.push(token);
            }
        } else {
            output.push(token);
        }
    }

    return output.join('');
}



function run_highlight(element) {
    element.querySelectorAll(".code").forEach(function (codeBlock) {
        if (codeBlock.querySelector(".copy-button")){
            return
        }
        const code = codeBlock.innerHTML;
        const highlightedCode = syntaxHighlight(code);
        codeBlock.innerHTML = highlightedCode;

        if (codeBlock.classList.contains("no-copy")) {
            return; // Skip adding the copy button if the class is present
        }

        // Add copy button to each code block
        const copyButton = document.createElement("button");
        copyButton.textContent = "Copy";
        copyButton.classList.add("copy-button");

        // Add copy functionality
        copyButton.addEventListener("click", function () {

            const code = codeBlock.innerText;

            copyToClipboard(code);
            
            copyButton.textContent = "Copied!";

            copyButton.style.backgroundColor = "MediumSeaGreen"

            setTimeout(() => {
                copyButton.textContent = "Copy"
                copyButton.style.backgroundColor = "#333"
            }, 500); // Reset after 2 seconds
        });
        
        while (codeBlock.querySelector(".copy-button")){
            codeBlock.removeChild(codeBlock.querySelector(".copy-button"));
        }
        if (codeBlock.querySelector(".copy-button")){
            return
        }
        codeBlock.appendChild(copyButton);
    });
}


document.addEventListener("DOMContentLoaded", function () {
    run_highlight(document)

    // runs everytime the page has cahnged
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            run_highlight(mutation.target)
        })
    });

    // Start observing the target node for configured mutations
    const targetNode = document.body; // or any specific element you want to observe
    observer.observe(targetNode, {
        childList: true, // Observe direct children
        subtree: true    // and lower descendants too
    });
});
