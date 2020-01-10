(function() {
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        const c = document.getElementById("sign");

        c.addEventListener("mousedown", setCoords);
        c.addEventListener("mousemove", freeForm);

        const ctx = c.getContext("2d");

        function setCoords(e) {
            const { x, y } = c.getBoundingClientRect();
            lastX = e.clientX - x;
            lastY = e.clientY - y;
        }

        function freeForm(e) {
            if (e.buttons !== 1) return;
            paint(e);
        }

        function paint(e) {
            const { x, y } = c.getBoundingClientRect();
            const newX = e.clientX - x;
            const newY = e.clientY - y;

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();

            lastX = newX;
            lastY = newY;
        }
    }
})();
