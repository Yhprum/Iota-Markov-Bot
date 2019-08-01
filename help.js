module.exports = input => {
    let output = "";
    if (input.length === 1) {
        output += "To use a command, type =command\n";
        output += "To get help on a command, type =help command\n";
        output += "Command list:\n";
        output += "help, markov, update, rename, img/pic/picture, derek, uwu";
    }
    switch (input[1].toLowerCase()) {
        case "markov":
            output += "=markov @username\n";
            output += "creates a message resembling something the user would say\n";
            output += "use =me to see yourself, or =system to see system messages";
            break;
        case "rename":
            output += "=rename @username -> new name\n";
            output += "rename your friends or enemies conveniently (1 hr cooldown)";
            break;
        case "update":
            output += "updates the markov generator with the new chats since last update";
            break;
        case "img":
        case "picture":
        case "pic":
            output += "=img name\n";
            output += "if a picture is attached, map the picture to the name given\n";
            output += "if no picture is attached, retrieves the picture mapped to the name";
            break;
        case "derek":
            output += "=derek text\n";
            output += "meme";
            break;
        case "uwu":
            output += "just don't use this one... please";
            break;
        case "help":
            output += "ಠ_ಠ";
            break;
        default:
            output += "that is not a command... probably";
            break;
    }
    return output;
};