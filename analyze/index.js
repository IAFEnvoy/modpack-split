const logToPage = (content) => {
    let obj = document.getElementById('logs');
    obj.innerHTML += content + '\n';
    obj.scrollTop = obj.scrollHeight
}

const analyze = async () => {
    document.getElementById('logs').innerHTML = ''

}