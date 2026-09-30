package com.jouney.especregistry.interfaces.screen;

import com.jouney.especregistry.infrastructure.persistence.screen.DataSourceCallLog;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Consultas a fontes de dados feitas ao montar as telas de uma instância — lidas pelo Diagnóstico
 * do admin/back ("consulta da tela"). */
@RestController
@RequestMapping("/api/v1/data-source-calls")
public class DataSourceCallController {

    private final DataSourceCallLog callLog;

    public DataSourceCallController(DataSourceCallLog callLog) {
        this.callLog = callLog;
    }

    @GetMapping
    public List<DataSourceCallLog.Call> list(@RequestParam String processInstanceId) {
        return callLog.findByProcessInstance(processInstanceId);
    }
}
