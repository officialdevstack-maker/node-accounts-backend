export function reportEvent(io, event) {
    const label = `${event.name}`;
    const time = `${event.ms}ms`;
    const dots = io.style('gray', '.'.repeat(Math.max(3, 70 - label.length - time.length)));
    const verdict = event.type === 'migrated' ? io.style('green', 'DONE') : io.style('yellow', 'REVERTED');
    io.line(`  ${label} ${dots} ${time} ${verdict}`);
}
//# sourceMappingURL=report.js.map