(function () {
  const core = window.DashboardCoreData;
  const analytics = window.DashboardCoreAnalytics;
  if (!core || !analytics) return;

  const { CONFIG, pad } = core;

  const clearCanvas = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawLineChart = (canvas, labels, values, color) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    clearCanvas(ctx, canvas);

    const max = Math.max(1, ...values);
    const padX = 44;
    const padY = 24;
    const width = canvas.width - padX * 2;
    const height = canvas.height - padY * 2;
    const step = labels.length > 1 ? width / (labels.length - 1) : width;

    ctx.strokeStyle = "#ddeaf3";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = padY + (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, i) => {
      const x = padX + step * i;
      const y = padY + height - (value / max) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = color;
    values.forEach((value, i) => {
      const x = padX + step * i;
      const y = padY + height - (value / max) * height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#406177";
    ctx.font = "11px Poppins";
    labels.forEach((label, i) => {
      if (i % 2 !== 0) return;
      const x = padX + step * i;
      ctx.fillText(label.slice(5), x - 12, canvas.height - 8);
    });
  };

  const drawBarChart = (canvas, labels, values, color) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    clearCanvas(ctx, canvas);

    const max = Math.max(1, ...values);
    const padX = 44;
    const padY = 24;
    const width = canvas.width - padX * 2;
    const height = canvas.height - padY * 2;
    const barWidth = width / labels.length - 4;

    ctx.strokeStyle = "#ddeaf3";
    for (let i = 0; i < 5; i += 1) {
      const y = padY + (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + width, y);
      ctx.stroke();
    }

    values.forEach((value, i) => {
      const ratio = value / max;
      const h = ratio * height;
      const x = padX + i * (barWidth + 4);
      const y = padY + height - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, h);
    });

    ctx.fillStyle = "#406177";
    ctx.font = "11px Poppins";
    labels.forEach((label, i) => {
      if (i % 2 !== 0) return;
      const x = padX + i * (barWidth + 4);
      ctx.fillText(label.slice(5), x, canvas.height - 8);
    });
  };

  const drawAreaChart = (canvas, labels, values, color) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    clearCanvas(ctx, canvas);

    const max = Math.max(1, ...values);
    const padX = 44;
    const padY = 24;
    const width = canvas.width - padX * 2;
    const height = canvas.height - padY * 2;
    const step = labels.length > 1 ? width / (labels.length - 1) : width;

    ctx.beginPath();
    values.forEach((value, i) => {
      const x = padX + step * i;
      const y = padY + height - (value / max) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padX + width, padY + height);
    ctx.lineTo(padX, padY + height);
    ctx.closePath();
    ctx.fillStyle = `${color}55`;
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, i) => {
      const x = padX + step * i;
      const y = padY + height - (value / max) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#406177";
    ctx.font = "10px Poppins";
    labels.forEach((label, i) => {
      if (i % 4 !== 0) return;
      const x = padX + step * i;
      ctx.fillText(label, x - 6, canvas.height - 8);
    });
  };

  const renderCharts = (bookings, chartEls) => {
    if (!chartEls) return;
    const todayIso = analytics.getTodayIso();
    const range = analytics.buildDateRange(CONFIG.trendDays, todayIso);
    const revenueSeries = analytics.getRevenueTrendSeries(bookings, range);
    const occupancySeries = analytics.getOccupancyTrendSeries(bookings, range);
    const occupancyPercentSeries = occupancySeries.map((value) =>
      Number(((value / CONFIG.totalAvailableRooms) * 100).toFixed(1))
    );
    const activityDensity = analytics.getActivityDensitySeries(bookings);
    const hourLabels = Array.from({ length: 24 }, (_, i) => pad(i));

    drawLineChart(chartEls.revenueTrendChart, range, revenueSeries, "#0d6ca1");
    drawBarChart(chartEls.occupancyTrendChart, range, occupancyPercentSeries, "#f08a3e");
    drawAreaChart(chartEls.activityDensityChart, hourLabels, activityDensity, "#2a8f6f");
  };

  window.DashboardCoreCharts = {
    clearCanvas,
    drawLineChart,
    drawBarChart,
    drawAreaChart,
    renderCharts,
  };
})();
