router.post("/mark-rated", async (req, res) => {
    try {
        const { userId, contractorId } = req.body;

        const appointment = await appointmentModel.findOne({
            userId,
            conId: contractorId,
        });

        if (!appointment) {
            return res.json({ success: false, message: "Appointment not found" });
        }

        // ✅ Update MongoDB to prevent multiple ratings
        await appointmentModel.findByIdAndUpdate(appointment._id, {
            hasBeenRated: true,
        });

        res.json({ success: true, message: "Appointment marked as rated" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
